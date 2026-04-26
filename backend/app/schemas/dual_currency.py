from typing import List, Optional
from pydantic import BaseModel

class PriceComparison(BaseModel):
    strikePrice: float
    direction: str
    okxAPY: Optional[float] = None
    bitgetAPY: Optional[float] = None
    binanceAPY: Optional[float] = None
    settlementDate: str

class PriceComparisonResponse(BaseModel):
    data: List[PriceComparison]
