#!/bin/bash
# 06 性能基线测试

test_performance() {
    log_section "06 性能基线"

    # 23. 首页响应时间
    HOME_TIME=$(curl -s -o /dev/null -w '%{time_total}' http://127.0.0.1/nanoai/)
    HOME_MS=$(echo "$HOME_TIME" | awk '{printf "%.0f", $1 * 1000}')
    if [[ "$HOME_MS" -lt 500 ]] 2>/dev/null; then
        log_pass "首页响应" "${HOME_MS}ms (< 500ms)"
    else
        log_fail "首页响应" "${HOME_MS}ms (≥ 500ms)"
    fi

    # 24. API 响应时间
    API_TIME=$(curl -s -o /dev/null -w '%{time_total}' http://127.0.0.1/health)
    API_MS=$(echo "$API_TIME" | awk '{printf "%.0f", $1 * 1000}')
    if [[ "$API_MS" -lt 200 ]] 2>/dev/null; then
        log_pass "API 响应" "${API_MS}ms (< 200ms)"
    else
        log_fail "API 响应" "${API_MS}ms (≥ 200ms)"
    fi

    # 25. 内存使用
    MEM_USED=$(free -m | awk '/Mem:/{printf "%.0f", $3}')
    MEM_TOTAL=$(free -m | awk '/Mem:/{printf "%.0f", $2}')
    MEM_PCT=$(awk "BEGIN{printf \"%.0f\", ${MEM_USED}/${MEM_TOTAL}*100}")
    if [[ "$MEM_PCT" -lt 80 ]] 2>/dev/null; then
        log_pass "内存使用" "${MEM_USED}M / ${MEM_TOTAL}M (${MEM_PCT}%)"
    else
        log_fail "内存使用" "${MEM_USED}M / ${MEM_TOTAL}M (${MEM_PCT}%)"
    fi

    # 26. 磁盘使用
    DISK_PCT=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
    DISK_INFO=$(df -h / | awk 'NR==2{print $3"/"$2" ("$5")"}')
    if [[ "$DISK_PCT" -lt 80 ]] 2>/dev/null; then
        log_pass "磁盘使用" "${DISK_INFO}"
    else
        log_fail "磁盘使用" "${DISK_INFO} (≥ 80%)"
    fi

    # 27. Swap 使用
    SWAP_USED=$(free -m | awk '/Swap:/{print $3}')
    SWAP_TOTAL=$(free -m | awk '/Swap:/{print $2}')
    if [[ "$SWAP_TOTAL" -gt 0 ]] 2>/dev/null; then
        log_pass "Swap" "${SWAP_USED}M / ${SWAP_TOTAL}M"
    else
        log_skip "Swap" "未配置"
    fi

    # 28. 后端进程内存
    BACKEND_PID=$(pgrep -f "uvicorn app.main:app" | head -1)
    if [[ -n "$BACKEND_PID" ]]; then
        BACKEND_RSS=$(ps -o rss= -p "$BACKEND_PID" | awk '{printf "%.0f", $1/1024}')
        log_pass "后端内存" "${BACKEND_RSS}M (PID: ${BACKEND_PID})"
    else
        log_skip "后端内存" "进程未找到"
    fi
}
