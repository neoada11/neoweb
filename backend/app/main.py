from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import dual_currency

app = FastAPI(
    title="双币赢API",
    description="获取各个交易所双币赢产品报价并进行对比",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(dual_currency.router, prefix="/api", tags=["dual_currency"])

@app.get("/")
async def root():
    return {"message": "双币赢API服务运行中"}
