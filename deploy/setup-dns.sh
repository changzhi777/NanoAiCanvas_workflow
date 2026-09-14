#!/bin/bash
# ============================================
# 内部 DNS 配置 — 自动检测并添加 nanoai.qm.com
# 在 PVE 上执行（需要访问 LXC 105）
# 用法: bash setup-dns.sh install|verify|uninstall
# ============================================
set -uo pipefail

DNS_CTID=105
TARGET_IP="10.10.10.31"
DOMAIN="qm.com"
RECORD="nanoai.qm.com"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

case "${1:-install}" in
    install)
        echo -e "${GREEN}=== 检测 DNS 服务 ===${NC}"

        # 检测 DNS 软件
        DNS_TYPE=$(pct exec $DNS_CTID -- sh -c '
            if command -v dnsmasq >/dev/null 2>&1 || pidof dnsmasq >/dev/null 2>&1; then
                echo "dnsmasq"
            elif command -v coredns >/dev/null 2>&1 || pidof coredns >/dev/null 2>&1; then
                echo "coredns"
            elif command -v named >/dev/null 2>&1 || pidof named >/dev/null 2>&1; then
                echo "bind"
            elif command -v unbound >/dev/null 2>&1 || pidof unbound >/dev/null 2>&1; then
                echo "unbound"
            elif [ -f /etc/coredns/Corefile ]; then
                echo "coredns"
            elif [ -f /etc/dnsmasq.conf ]; then
                echo "dnsmasq"
            elif [ -f /etc/bind/named.conf ]; then
                echo "bind"
            else
                echo "unknown"
            fi
        ' 2>/dev/null)

        echo "检测到: $DNS_TYPE"

        case "$DNS_TYPE" in
            dnsmasq)
                echo -e "${GREEN}配置 dnsmasq...${NC}"
                pct exec $DNS_CTID -- sh -c "
                    grep -q 'nanoai.qm.com' /etc/dnsmasq.conf 2>/dev/null || {
                        echo 'address=/nanoai.qm.com/${TARGET_IP}' >> /etc/dnsmasq.conf
                        echo 'local=/qm.com/' >> /etc/dnsmasq.conf
                    }
                    dnsmasq --test 2>/dev/null
                    kill -HUP \$(pidof dnsmasq) 2>/dev/null || rc-service dnsmasq restart 2>/dev/null || systemctl restart dnsmasq 2>/dev/null
                    echo DNS_RELOADED
                "
                ;;
            coredns)
                echo -e "${GREEN}配置 CoreDNS...${NC}"
                pct exec $DNS_CTID -- sh -c "
                    if [ -f /etc/coredns/Corefile ]; then
                        grep -q 'qm.com' /etc/coredns/Corefile || cat >> /etc/coredns/Corefile << 'COREEOF'
qm.com {
    hosts {
        ${TARGET_IP} nanoai.qm.com
        fallthrough
    }
    log
    errors
}
COREEOF
                        kill -HUP \$(pidof coredns) 2>/dev/null || rc-service coredns restart 2>/dev/null
                        echo DNS_RELOADED
                    fi
                "
                ;;
            bind)
                echo -e "${GREEN}配置 BIND...${NC}"
                pct exec $DNS_CTID -- sh -c "
                    grep -q 'qm.com' /etc/bind/named.conf.local 2>/dev/null || {
                        cat >> /etc/bind/named.conf.local << 'BINDEOF'
zone \"qm.com\" {
    type master;
    file \"/etc/bind/zones/qm.com.db\";
};
BINDEOF
                        mkdir -p /etc/bind/zones
                        cat > /etc/bind/zones/qm.com.db << 'ZONEEOF'
\$TTL 300
@       IN      SOA     ns.qm.com. admin.qm.com. (
                        2026060801      ; Serial
                        3600            ; Refresh
                        900             ; Retry
                        604800          ; Expire
                        300 )           ; TTL

@               IN      NS      ns.qm.com.
ns              IN      A       10.10.10.105
nanoai          IN      A       ${TARGET_IP}
ZONEEOF
                    }
                    named-checkzone qm.com /etc/bind/zones/qm.com.db
                    kill -HUP \$(pidof named) 2>/dev/null || systemctl reload bind9 2>/dev/null
                    echo DNS_RELOADED
                "
                ;;
            unbound)
                echo -e "${GREEN}配置 Unbound...${NC}"
                pct exec $DNS_CTID -- sh -c "
                    grep -q 'qm.com' /etc/unbound/unbound.conf 2>/dev/null || {
                        cat >> /etc/unbound/unbound.conf << 'UNBOUNDEOF'
local-zone: \"qm.com.\" static
local-data: \"nanoai.qm.com. IN A ${TARGET_IP}\"
UNBOUNDEOF
                    }
                    unbound-control reload 2>/dev/null || kill -HUP \$(pidof unbound) 2>/dev/null
                    echo DNS_RELOADED
                "
                ;;
            *)
                echo -e "${RED}❌ 无法检测 DNS 软件，手动配置${NC}"
                echo "请登录 LXC $DNS_CTID 手动添加："
                echo "  A record: $RECORD → $TARGET_IP"
                exit 1
                ;;
        esac

        echo -e "${GREEN}✅ DNS 配置完成${NC}"
        ;;

    verify)
        echo "=== DNS 验证 ==="
        # 从 PVE 测试
        pct exec $DNS_CTID -- sh -c "nslookup $RECORD 127.0.0.1 2>&1" || \
        pct exec $DNS_CTID -- sh -c "dig @127.0.0.1 $RECORD +short 2>&1"

        echo ""
        echo "=== 从 .31 测试 ==="
        # 从 nanoai 服务器测试
        ssh -o StrictHostKeyChecking=no root@10.10.10.31 "dig @10.10.10.105 $RECORD +short 2>/dev/null || nslookup $RECORD 10.10.10.105 2>&1"
        ;;

    uninstall)
        echo "移除 DNS 记录..."
        pct exec $DNS_CTID -- sh -c "
            sed -i '/nanoai.qm.com/d' /etc/dnsmasq.conf 2>/dev/null
            sed -i '/qm.com/d' /etc/coredns/Corefile 2>/dev/null
            kill -HUP \$(pidof dnsmasq coredns named unbound) 2>/dev/null
            echo REMOVED
        "
        ;;

    *)
        echo "用法: $0 {install|verify|uninstall}"
        ;;
esac
