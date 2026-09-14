#!/bin/bash
# 02 服务层测试

test_services() {
    log_section "02 服务层"

    # 5. Nginx 运行
    NGINX_STATUS=$(systemctl is-active nginx 2>/dev/null)
    if [[ "$NGINX_STATUS" == "active" ]]; then
        NGINX_VER=$(nginx -v 2>&1 | awk -F'/' '{print $2}')
        log_pass "Nginx 运行" "active (${NGINX_VER})"
    else
        log_fail "Nginx 运行" "状态: ${NGINX_STATUS}"
    fi

    # 6. Nginx 配置语法
    if nginx -t 2>&1 | grep -q "ok"; then
        log_pass "Nginx 配置" "syntax OK"
    else
        log_fail "Nginx 配置" "$(nginx -t 2>&1 | tail -1)"
    fi

    # 7. 后端服务运行
    BACKEND_STATUS=$(systemctl is-active nanoai-backend 2>/dev/null)
    if [[ "$BACKEND_STATUS" == "active" ]]; then
        BACKEND_UPTIME=$(systemctl show nanoai-backend --property=ActiveEnterTimestamp --value | awk '{print $1,$2,$3}')
        log_pass "后端服务" "active (启动于 ${BACKEND_UPTIME})"
    else
        log_fail "后端服务" "状态: ${BACKEND_STATUS}"
    fi

    # 8. 端口监听
    PORT_80=$(ss -tlnp | grep ':80 ' | head -1)
    PORT_8000=$(ss -tlnp | grep ':8000 ' | head -1)
    if [[ -n "$PORT_80" ]] && [[ -n "$PORT_8000" ]]; then
        log_pass "端口监听" ":80 nginx + :8000 uvicorn"
    elif [[ -n "$PORT_80" ]]; then
        log_fail "端口监听" ":80 OK, :8000 未监听"
    elif [[ -n "$PORT_8000" ]]; then
        log_fail "端口监听" ":8000 OK, :80 未监听"
    else
        log_fail "端口监听" ":80 和 :8000 均未监听"
    fi
}
