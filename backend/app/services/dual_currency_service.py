from typing import List
from app.schemas.dual_currency import PriceComparison
from app.exchanges.okx import get_okx_dual_currency
from app.exchanges.bitget import get_bitget_dual_currency
from app.exchanges.binance import get_binance_dual_currency

async def get_dual_currency_data(currency: str, date: str) -> List[PriceComparison]:
    """
    获取指定币种和日期的双币赢产品报价对比
    """
    # 从各个交易所获取数据
    okx_data = await get_okx_dual_currency(currency, date)
    bitget_data = await get_bitget_dual_currency(currency, date)
    binance_data = await get_binance_dual_currency(currency, date)
    
    # 合并数据
    combined_data = []
    
    # 收集所有行权价格
    strike_prices = set()
    for data in [okx_data, bitget_data, binance_data]:
        for item in data:
            strike_prices.add(item.strikePrice)
    
    # 按行权价格分组并合并数据
    for strike_price in sorted(strike_prices):
        # 查找每个交易所对应行权价格的数据
        okx_item = next((item for item in okx_data if item.strikePrice == strike_price), None)
        bitget_item = next((item for item in bitget_data if item.strikePrice == strike_price), None)
        binance_item = next((item for item in binance_data if item.strikePrice == strike_price), None)
        
        # 确定方向（使用第一个找到的方向）
        direction = okx_item.direction if okx_item else bitget_item.direction if bitget_item else binance_item.direction
        
        # 创建合并后的价格对比数据
        comparison = PriceComparison(
            strikePrice=strike_price,
            direction=direction,
            okxAPY=okx_item.okxAPY if okx_item else None,
            bitgetAPY=bitget_item.bitgetAPY if bitget_item else None,
            binanceAPY=binance_item.binanceAPY if binance_item else None,
            settlementDate=date
        )
        
        combined_data.append(comparison)
    
    return combined_data
