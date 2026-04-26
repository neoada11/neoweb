import time
import hmac
import hashlib
import requests
from typing import List
from app.schemas.dual_currency import PriceComparison

async def get_binance_dual_currency(currency: str, date: str) -> List[PriceComparison]:
    """
    从币安获取双币赢产品数据
    """
    # Binance API 配置
    api_key = "YOUR_API_KEY"
    api_secret = "YOUR_API_SECRET"
    base_url = "https://api.binance.com"
    
    # 准备请求参数
    symbol = currency.replace("/", "")
    
    # 生成签名
    def generate_signature(params):
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        signature = hmac.new(api_secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
        return signature
    
    # 构建请求参数
    params = {
        "symbol": symbol,
        "settlementDate": date,
        "timestamp": int(time.time() * 1000)
    }
    
    # 生成签名
    params["signature"] = generate_signature(params)
    
    # 构建请求头
    headers = {
        "X-MBX-APIKEY": api_key
    }
    
    try:
        # 发送请求
        response = requests.get(f"{base_url}/sapi/v1/structured-products/list", headers=headers, params=params)
        response.raise_for_status()
        
        # 解析响应
        data = response.json()
        
        # 提取数据
        result = []
        if isinstance(data, list):
            for item in data:
                # 解析方向
                direction = "up" if item.get("direction") == "CALL" else "down"
                
                # 解析年化收益率
                apy = float(item.get("annualizedReturn", "0")) if item.get("annualizedReturn") else None
                
                # 解析行权价格
                strike_price = float(item.get("strikePrice", "0")) if item.get("strikePrice") else 0
                
                # 创建PriceComparison对象
                comparison = PriceComparison(
                    strikePrice=strike_price,
                    direction=direction,
                    okxAPY=None,
                    bitgetAPY=None,
                    binanceAPY=apy,
                    settlementDate=date
                )
                result.append(comparison)
        
        return result
    except Exception as e:
        print(f"Error fetching Binance dual currency data: {e}")
        # 发生错误时返回空列表
        return []
