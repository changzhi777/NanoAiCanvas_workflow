#!/bin/bash
# 01 网络层测试

test_network() {
    log_section "01 网络层"

    # 1. DNS 解析
    if dig +short aliyun.com | head -1 | grep -qE '^[0-9]'; then
        DNS_MS=$(dig aliyun.com | grep "Query time" | awk '{print $4}')
        log_pass "DNS 解析" "${DNS_MS}ms"
    else
        log_fail "DNS 解析" "无法解析 aliyun.com"
    fi

    # 2. 网关可达
    if ping -c 2 -W 3 10.10.10.1 &>/dev/null; then
        GW_MS=$(ping -c 1 10.10.10.1 | tail -1 | awk -F'/' '{print $5}')
        log_pass "网关可达" "10.10.10.1 (${GW_MS}ms)"
    else
        log_fail "网关可达" "10.10.10.1 不可达"
    fi

    # 3. Tailscale 状态
    if command -v tailscale &>/dev/null; then
        TS_STATUS=$(tailscale status --json 2>/dev/null)
        if echo "$TS_STATUS" | grep -q '"Running":true'; then
            TS_IP=$(tailscale ip 2>/dev/null || echo "N/A")
            TS_DNS=$(echo "$TS_STATUS" | grep -oP '"DNSName":"[^"]+"' | head -1 | cut -d'"' -f4)
            log_pass "Tailscale" "IP: ${TS_IP} | DNS: ${TS_DNS}"
        else
            TS_ERR=$(tailscale status 2>&1 | head -1)
            log_fail "Tailscale" "未运行: $TS_ERR"
        fi
    else
        log_skip "Tailscale" "未安装"
    fi

    # 4. 外网连通
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 https://mirrors.aliyun.com 2>/dev/null)
    if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
        log_pass "外网连通" "aliyun.com HTTP ${HTTP_CODE}"
    else
        log_fail "外网连通" "HTTP ${HTTP_CODE:-timeout}"
    fi
}
