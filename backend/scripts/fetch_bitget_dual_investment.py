from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path


CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.exchanges.bitget import fetch_bitget_dual_investment_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="一次性抓取 Bitget 双币投资 BTC 高卖/低买在不同到期时间下的 APY。"
    )
    parser.add_argument(
        "--currency",
        default="BTC",
        help="要抓取的币种，默认 BTC。",
    )
    parser.add_argument(
        "--output",
        help="输出文件路径；支持 .json 和 .csv。未传时直接打印到 stdout。",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON 输出缩进，默认 2。",
    )
    return parser.parse_args()


def write_output(rows: list[dict], output_path: str | None, indent: int) -> None:
    if not output_path:
        print(json.dumps(rows, ensure_ascii=False, indent=indent))
        return

    target = Path(output_path).expanduser().resolve()
    target.parent.mkdir(parents=True, exist_ok=True)

    if target.suffix.lower() == ".csv":
        with target.open("w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=list(rows[0].keys()) if rows else [])
            if rows:
                writer.writeheader()
                writer.writerows(rows)
        return

    with target.open("w", encoding="utf-8") as json_file:
        json.dump(rows, json_file, ensure_ascii=False, indent=indent)
        json_file.write(os.linesep)


def main() -> int:
    args = parse_args()
    rows = fetch_bitget_dual_investment_rows(args.currency)
    write_output(rows, args.output, args.indent)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
