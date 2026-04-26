import os
import sys
from typing import List

# 添加项目根目录到sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.schemas.dual_currency import PriceComparison
import asyncio
from okx.api import Earn

async def get_okx_dual_currency(currency: str, date: str = None) -> List[PriceComparison]:
    """
    从OKX获取双币赢产品数据
    先获取所有可支持的日期，再获取不同价格对应的年化利率
    """
    # OKX API 配置
    api_key = "YOUR_API_KEY"
    api_secret = "YOUR_API_SECRET"
    api_passphrase = "YOUR_API_PASSPHRASE"
    
    # 准备请求参数
    instrument_id = currency.replace("/", "-")
    base_currency = instrument_id.split('-')[0]  # 只使用基础货币，如BTC
    
    try:
        # 初始化Earn对象
        earn = Earn(
            key=api_key,
            secret=api_secret,
            passphrase=api_passphrase,
            flag="0"  # 0: 实盘环境, 1: 模拟盘环境
        )
        
        # 调用API获取双币赢产品数据
        result = earn.get_offers(
            ccy=base_currency
        )
        
        # 提取数据
        comparison_list = []
        if result and result.get("code") == "0" and result.get("data"):
            # 首先收集所有可支持的日期
            supported_dates = set()
            for item in result["data"]:
                if item.get("settleDate"):
                    supported_dates.add(item.get("settleDate"))
            
            print(f"OKX双币赢支持的日期: {sorted(supported_dates)}")
            
            # 如果指定了日期，则只获取该日期的数据
            target_dates = [date] if date else sorted(supported_dates)
            
            # 针对每个日期，获取不同价格对应的年化利率
            for target_date in target_dates:
                for item in result["data"]:
                    # 只处理当前日期的数据
                    if item.get("settleDate") == target_date:
                        # 解析方向
                        direction = "up" if item.get("direction") == "call" else "down"
                        
                        # 解析年化收益率
                        apy = float(item.get("apy", "0")) if item.get("apy") else None
                        
                        # 解析行权价格
                        strike_price = float(item.get("strikePx", "0")) if item.get("strikePx") else 0
                        
                        # 创建PriceComparison对象
                        comparison = PriceComparison(
                            strikePrice=strike_price,
                            direction=direction,
                            okxAPY=apy,
                            bitgetAPY=None,
                            binanceAPY=None,
                            settlementDate=target_date
                        )
                        comparison_list.append(comparison)
        
        return comparison_list
    except Exception as e:
        print(f"Error fetching OKX dual currency data: {e}")
        # 发生错误时返回空列表
        return []


if __name__ == "__main__":
    
    async def test():
        # 测试获取 BTC/USDT 的双币赢产品数据
        result = await get_okx_dual_currency("BTC/USDT", "2024-12-31")
        print(f"获取到 {len(result)} 条数据")
        for item in result:
            print(f"行权价: {item.strikePrice}, 方向: {item.direction}, OKX APY: {item.okxAPY}")
    
    asyncio.run(test())
