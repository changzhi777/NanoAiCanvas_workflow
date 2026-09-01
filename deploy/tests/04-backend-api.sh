#!/bin/bash
# 04 后端 API 测试

test_backend_api() {
    log_section "04 后端 API"

    # 13. /health
    HEALTH=$(curl -s --connect-timeout 5 http://127.0.0.1/health 2>/dev/null)
    if [[ -n "$HEALTH" ]]; then
        HEALTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/health)
        log_pass "/health" "HTTP ${HEALTH_CODE} - $(echo "$HEALTH" | head -c 80)"
    else
        log_fail "/health" "无响应"
    fi

    # 14. /api/ 前缀
    API_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://127.0.0.1/api/auth/login)
    if [[ "$API_CODE" != "502" ]] && [[ "$API_CODE" != "000" ]]; then
        log_pass "/api 前缀" "HTTP ${API_CODE} (非 502)"
    else
        log_fail "/api 前缀" "HTTP ${API_CODE}"
    fi

    # 15. /v2/ 前缀
    V2_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://127.0.0.1/v2/)
    if [[ "$V2_CODE" != "502" ]] && [[ "$V2_CODE" != "000" ]]; then
        log_pass "/v2 前缀" "HTTP ${V2_CODE} (非 502)"
    else
        log_fail "/v2 前缀" "HTTP ${V2_CODE}"
    fi

    # 16. /nanoai/api 前缀
    NC_API_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://127.0.0.1/nanoai/api/auth/login)
    if [[ "$NC_API_CODE" != "502" ]] && [[ "$NC_API_CODE" != "000" ]]; then
        log_pass "/nanoai/api" "HTTP ${NC_API_CODE}"
    else
        log_fail "/nanoai/api" "HTTP ${NC_API_CODE}"
    fi

    # 17. WebSocket upgrade（加 --max-time 防挂起）
    WS_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 \
        -H "Upgrade: websocket" \
        -H "Connection: Upgrade" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
        http://127.0.0.1/ws/)
    if [[ "$WS_CODE" == "101" ]]; then
        log_pass "WebSocket" "upgrade 101"
    else
        log_fail "WebSocket" "HTTP ${WS_CODE} (期望 101)"
    fi
}
