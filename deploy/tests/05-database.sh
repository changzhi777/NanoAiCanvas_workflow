#!/bin/bash
# 05 数据库测试

test_database() {
    log_section "05 数据库"

    source /opt/nanoai/backend/venv/bin/activate 2>/dev/null

    # 18. PostgreSQL 连接
    PG_RESULT=$(python3 -c "
import asyncio, asyncpg
async def test():
    try:
        conn = await asyncpg.connect('postgresql://nanoai:nanoai2026@10.10.10.11:5432/nanoai')
        ver = await conn.fetchval('SELECT version()')
        await conn.close()
        print(f'OK|{ver.split(\",\")[0]}')
    except Exception as e:
        print(f'FAIL|{e}')
asyncio.run(test())
" 2>/dev/null)
    PG_STATUS=$(echo "$PG_RESULT" | cut -d'|' -f1)
    PG_DETAIL=$(echo "$PG_RESULT" | cut -d'|' -f2-)
    if [[ "$PG_STATUS" == "OK" ]]; then
        log_pass "PG 连接" "${PG_DETAIL}"
    else
        log_fail "PG 连接" "${PG_DETAIL}"
    fi

    # 19. PG 编码
    PG_ENC=$(python3 -c "
import asyncio, asyncpg
async def test():
    conn = await asyncpg.connect('postgresql://nanoai:nanoai2026@10.10.10.11:5432/nanoai')
    enc = await conn.fetchval(\"SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname='nanoai'\")
    await conn.close()
    print(enc)
asyncio.run(test())
" 2>/dev/null)
    if [[ "$PG_ENC" == "UTF8" ]]; then
        log_pass "PG 编码" "UTF8"
    else
        log_fail "PG 编码" "${PG_ENC:-查询失败} (期望 UTF8)"
    fi

    # 20. PG 表数量
    PG_TABLES=$(python3 -c "
import asyncio, asyncpg
async def test():
    conn = await asyncpg.connect('postgresql://nanoai:nanoai2026@10.10.10.11:5432/nanoai')
    count = await conn.fetchval(\"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\")
    await conn.close()
    print(count)
asyncio.run(test())
" 2>/dev/null)
    if [[ "$PG_TABLES" -gt 0 ]] 2>/dev/null; then
        log_pass "PG 迁移" "${PG_TABLES} 张表"
    else
        log_fail "PG 迁移" "${PG_TABLES:-0} 张表 (迁移未执行?)"
    fi

    # 21. PG 并发连接（10 并发）
    PG_POOL=$(python3 -c "
import asyncio, asyncpg, time
async def test():
    try:
        pool = await asyncpg.create_pool('postgresql://nanoai:nanoai2026@10.10.10.11:5432/nanoai', min_size=5, max_size=10)
        start = time.time()
        async def q():
            async with pool.acquire() as conn:
                await conn.fetchval('SELECT 1')
        await asyncio.gather(*[q() for _ in range(10)])
        elapsed = (time.time() - start) * 1000
        await pool.close()
        print(f'OK|10并发 {elapsed:.0f}ms')
    except Exception as e:
        print(f'FAIL|{e}')
asyncio.run(test())
" 2>/dev/null)
    PG_POOL_STATUS=$(echo "$PG_POOL" | cut -d'|' -f1)
    PG_POOL_DETAIL=$(echo "$PG_POOL" | cut -d'|' -f2-)
    if [[ "$PG_POOL_STATUS" == "OK" ]]; then
        log_pass "PG 并发" "${PG_POOL_DETAIL}"
    else
        log_fail "PG 并发" "${PG_POOL_DETAIL}"
    fi

    # 22. Redis 连接
    REDIS_RESULT=$(python3 -c "
import redis
try:
    r = redis.Redis(host='10.10.10.13', port=6379, password='redis_pass_2026', decode_responses=True, socket_timeout=5)
    r.ping()
    info = r.info('server')
    print(f'OK|{info.get(\"redis_version\",\"?\")}')
except Exception as e:
    print(f'FAIL|{e}')
" 2>/dev/null)
    REDIS_STATUS=$(echo "$REDIS_RESULT" | cut -d'|' -f1)
    REDIS_DETAIL=$(echo "$REDIS_RESULT" | cut -d'|' -f2-)
    if [[ "$REDIS_STATUS" == "OK" ]]; then
        log_pass "Redis 连接" "v${REDIS_DETAIL}"
    else
        log_fail "Redis 连接" "${REDIS_DETAIL}"
    fi

    # 23. Redis 延迟
    REDIS_LAT=$(python3 -c "
import redis, time
r = redis.Redis(host='10.10.10.13', port=6379, password='redis_pass_2026', socket_timeout=5)
start = time.time()
for _ in range(100):
    r.ping()
elapsed = (time.time() - start) * 1000 / 100
print(f'{elapsed:.2f}')
" 2>/dev/null)
    if [[ -n "$REDIS_LAT" ]]; then
        LAT_MS=$(echo "$REDIS_LAT" | awk '{printf "%.1f", $1}')
        if awk "BEGIN{exit ($LAT_MS < 5) ? 1 : 0}"; then
            log_pass "Redis 延迟" "${LAT_MS}ms/次 (< 5ms)"
        else
            log_fail "Redis 延迟" "${LAT_MS}ms/次 (≥ 5ms)"
        fi
    else
        log_skip "Redis 延迟" "无法测量"
    fi
}
