#!/bin/bash
# 03 前端测试

test_frontend() {
    log_section "03 前端"

    # 9. index.html
    INDEX_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/nanoai/)
    INDEX_SIZE=$(curl -s -o /dev/null -w '%{size_download}' http://127.0.0.1/nanoai/)
    if [[ "$INDEX_CODE" == "200" ]] && [[ "$INDEX_SIZE" -gt 500 ]]; then
        log_pass "index.html" "HTTP 200 (${INDEX_SIZE} bytes)"
    elif [[ "$INDEX_CODE" == "200" ]]; then
        log_fail "index.html" "HTTP 200 但内容过小 (${INDEX_SIZE} bytes)"
    else
        log_fail "index.html" "HTTP ${INDEX_CODE}"
    fi

    # 10. JS 资源
    JS_FILE=$(curl -s http://127.0.0.1/nanoai/ | grep -oP '/nanoai/assets/[^"]+\.js' | head -1)
    if [[ -n "$JS_FILE" ]]; then
        JS_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1${JS_FILE}")
        if [[ "$JS_CODE" == "200" ]]; then
            log_pass "JS 资源" "${JS_FILE} → ${JS_CODE}"
        else
            log_fail "JS 资源" "${JS_FILE} → ${JS_CODE}"
        fi
    else
        log_fail "JS 资源" "未找到 JS 引用"
    fi

    # 11. CSS 资源
    CSS_FILE=$(curl -s http://127.0.0.1/nanoai/ | grep -oP '/nanoai/assets/[^"]+\.css' | head -1)
    if [[ -n "$CSS_FILE" ]]; then
        CSS_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1${CSS_FILE}")
        if [[ "$CSS_CODE" == "200" ]]; then
            log_pass "CSS 资源" "${CSS_FILE} → ${CSS_CODE}"
        else
            log_fail "CSS 资源" "${CSS_FILE} → ${CSS_CODE}"
        fi
    else
        log_skip "CSS 资源" "未找到 CSS 引用（可能内联）"
    fi

    # 12. SPA fallback（任意路径应返回 index.html）
    SPA_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/nanoai/nonexistent-path-123)
    SPA_SIZE=$(curl -s -o /dev/null -w '%{size_download}' http://127.0.0.1/nanoai/nonexistent-path-123)
    if [[ "$SPA_CODE" == "200" ]] && [[ "$SPA_SIZE" -gt 500 ]]; then
        log_pass "SPA fallback" "任意路径 → 200 (${SPA_SIZE} bytes)"
    else
        log_fail "SPA fallback" "HTTP ${SPA_CODE} (${SPA_SIZE} bytes)"
    fi
}
