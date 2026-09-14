# ==================== test stage ====================
FROM python:3.12-slim AS test

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 测试用额外依赖
RUN pip install --no-cache-dir aiofiles asyncpg aiosqlite pytest pytest-asyncio pytest-cov

COPY . .

# CI: docker build --target test → pytest tests/
CMD ["pytest", "tests/", "-v", "--tb=short"]


# ==================== runtime stage ====================
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 仅拷 app/ 业务代码（不含 tests/）
COPY --from=test /app/app ./app
# alembic 迁移配置 + 版本脚本
COPY --from=test /app/alembic.ini ./alembic.ini
COPY --from=test /app/alembic ./alembic

EXPOSE 8000

# 启动前运行数据库迁移
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
