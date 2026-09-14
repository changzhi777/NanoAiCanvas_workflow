#!/bin/sh
# AdGuardHome DNS 重写配置
# 在 LXC 105 上执行
# 用法: sh setup-adguard-dns.sh

YAML="/opt/AdGuardHome/AdGuardHome.yaml"
BACKUP="${YAML}.bak.$(date +%Y%m%d%H%M%S)"

echo "=== 备份配置 ==="
cp "$YAML" "$BACKUP"
echo "备份: $BACKUP"

echo "=== 检查现有记录 ==="
if grep -q "nanoai.qm.com" "$YAML"; then
    echo "nanoai.qm.com 已存在，跳过"
    exit 0
fi

echo "=== 添加 DNS 重写 ==="
# 在 dns.home 条目后追加
sed -i '/domain: dns.home/a\    - domain: nanoai.qm.com\n      answer: 10.10.10.31\n      enabled: true' "$YAML"

echo "=== 验证配置 ==="
grep -A3 "nanoai" "$YAML"

echo "=== 重启 AdGuardHome ==="
pkill AdGuardHome
sleep 1
/opt/AdGuardHome/AdGuardHome -c /opt/AdGuardHome/AdGuardHome.yaml -w /opt/AdGuardHome &
sleep 2

echo "=== 测试解析 ==="
nslookup nanoai.qm.com 127.0.0.1
