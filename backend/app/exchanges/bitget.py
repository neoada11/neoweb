from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Dict, Iterable, List, Optional

import requests

from app.schemas.dual_currency import PriceComparison

BITGET_BASE_URL = "https://www.bitget.com"
BITGET_REFERER = f"{BITGET_BASE_URL}/zh-CN/earning/dual-investment"
BITGET_TIMEOUT = 20
BITGET_MAX_RETRIES = 5


@dataclass(frozen=True)
class BitgetDirectionConfig:
    product_token_id: int
    trade_token_id: int
    direction: int


def _create_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json;charset=UTF-8",
            "Language": "zh_CN",
            "Locale": "zh_CN",
            "Origin": BITGET_BASE_URL,
            "Referer": BITGET_REFERER,
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/147.0.0.0 Safari/537.36"
            ),
        }
    )
    return session


def _post_json(
    session: requests.Session,
    path: str,
    payload: dict,
) -> dict:
    last_error: Optional[Exception] = None

    for attempt in range(BITGET_MAX_RETRIES):
        try:
            response = session.post(
                f"{BITGET_BASE_URL}{path}",
                json=payload,
                timeout=BITGET_TIMEOUT,
            )

            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                sleep_seconds = float(retry_after) if retry_after else 1.5 * (attempt + 1)
                time.sleep(sleep_seconds)
                continue

            response.raise_for_status()
            data = response.json()
            if data.get("code") != "200":
                raise ValueError(f"Bitget API returned error for {path}: {data}")
            return data
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt == BITGET_MAX_RETRIES - 1:
                break
            time.sleep(1.2 * (attempt + 1))

    raise RuntimeError(f"Bitget request failed for {path}") from last_error


def _load_direction_configs(
    session: requests.Session,
    currency: str,
) -> Dict[int, BitgetDirectionConfig]:
    data = _post_json(
        session,
        "/v1/finance/dualInvest/product/template/list/v2",
        {"tokenName": "", "matchAssets": 0},
    )
    symbol = currency.upper().replace("/USDT", "").replace("/", "")
    for item in data.get("data", []):
        if item.get("tokenName") != symbol:
            continue

        configs: Dict[int, BitgetDirectionConfig] = {}
        for direction_item in item.get("directionList", []):
            direction = int(direction_item["direction"])
            configs[direction] = BitgetDirectionConfig(
                product_token_id=int(direction_item["productTokenId"]),
                trade_token_id=int(direction_item["tradeTokenId"]),
                direction=direction,
            )
        if configs:
            return configs

    raise ValueError(f"Bitget dual investment does not support symbol: {currency}")


def _load_settlement_dates(
    session: requests.Session,
    config: BitgetDirectionConfig,
) -> List[int]:
    data = _post_json(
        session,
        "/v1/finance/dualInvest/product/settle/date/list",
        {
            "productTokenId": config.product_token_id,
            "tradeTokenId": config.trade_token_id,
            "direction": config.direction,
        },
    )
    return [int(item) for item in data.get("data", [])]


def _format_settlement_date(timestamp_ms: int) -> str:
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).strftime(
        "%Y-%m-%d"
    )


def _normalize_direction(direction: int) -> str:
    return "up" if direction == 1 else "down"


def _fetch_products_for_date(
    session: requests.Session,
    config: BitgetDirectionConfig,
    settlement_ts: int,
) -> List[dict]:
    payload = {
        "productTokenId": config.product_token_id,
        "tradeTokenId": config.trade_token_id,
        "direction": config.direction,
        "timeRange": "",
        "settleDate": str(settlement_ts),
        "fromCalendar": False,
    }

    ordinary_data = _post_json(
        session,
        "/v1/finance/dualInvest/ordinary/product/list",
        payload,
    )
    vip_data = _post_json(
        session,
        "/v1/finance/dualInvest/vip/product/list",
        payload,
    )

    products: List[dict] = []

    for group in ordinary_data.get("data", []):
        if int(group.get("settleDate", 0)) != settlement_ts:
            continue
        for item in group.get("productList", []):
            products.append({**item, "productType": "standard"})

    for item in vip_data.get("data", []):
        if int(item.get("settleDate", 0)) != settlement_ts:
            continue
        products.append({**item, "productType": "vip"})

    return products


def fetch_bitget_dual_investment_rows(currency: str = "BTC") -> List[dict]:
    session = _create_session()
    direction_configs = _load_direction_configs(session, currency)

    all_rows: List[dict] = []
    current_date = datetime.now(timezone.utc).date()

    for direction_code, direction_name in ((1, "high_sell"), (0, "low_buy")):
        config = direction_configs.get(direction_code)
        if not config:
            continue

        for settlement_ts in _load_settlement_dates(session, config):
            settlement_date = datetime.fromtimestamp(
                settlement_ts / 1000, tz=timezone.utc
            ).date()
            days_to_settlement = (settlement_date - current_date).days

            for item in _fetch_products_for_date(session, config, settlement_ts):
                all_rows.append(
                    {
                        "currency": currency.upper().replace("/", ""),
                        "direction": direction_name,
                        "direction_code": direction_code,
                        "product_type": item["productType"],
                        "settlement_date": _format_settlement_date(settlement_ts),
                        "days_to_settlement": days_to_settlement,
                        "target_price": float(item["targetPrice"]),
                        "apy": float(item["apy"]),
                        "exercise_proportion": float(item["exerciseProPortion"]),
                    }
                )
            time.sleep(0.35)

    all_rows.sort(
        key=lambda row: (
            row["direction_code"],
            row["days_to_settlement"],
            row["product_type"],
            row["target_price"],
        )
    )
    return all_rows


async def get_bitget_dual_currency(
    currency: str,
    date: Optional[str] = None,
) -> List[PriceComparison]:
    """
    从 Bitget 公网页接口获取双币赢数据。

    direction=1 表示高卖，direction=0 表示低买。
    现有对比接口沿用 `up/down` 字段以兼容前端。
    """
    try:
        rows = fetch_bitget_dual_investment_rows(currency)
    except Exception as exc:
        print(f"Error fetching Bitget dual investment data: {exc}")
        return []

    target_rows: Iterable[dict] = rows
    if date:
        target_rows = [row for row in rows if row["settlement_date"] == date]

    comparisons: List[PriceComparison] = []
    for row in target_rows:
        comparisons.append(
            PriceComparison(
                strikePrice=row["target_price"],
                direction=_normalize_direction(row["direction_code"]),
                okxAPY=None,
                bitgetAPY=row["apy"],
                binanceAPY=None,
                settlementDate=row["settlement_date"],
            )
        )

    return comparisons
