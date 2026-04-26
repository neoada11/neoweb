from fastapi import APIRouter, Query
from app.services.dual_currency_service import get_dual_currency_data
from app.schemas.dual_currency import PriceComparisonResponse

router = APIRouter()

@router.get("/dual-currency", response_model=PriceComparisonResponse)
async def get_dual_currency(
    currency: str = Query(..., description="币种对，如 BTC/USDT"),
    date: str = Query(..., description="结算日期，如 2026-03-24")
):
    """
    获取指定币种和日期的双币赢产品报价对比
    """
    data = await get_dual_currency_data(currency, date)
    return PriceComparisonResponse(data=data)
