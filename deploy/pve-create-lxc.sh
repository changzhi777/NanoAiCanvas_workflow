#!/bin/bash
# ============================================
# PVE 创建 LXC 容器脚本
# 在 PVE (10.10.10.10) 上执行
# ============================================
set -euo pipefail

# --- 配置 ---
CTID=131                    # 容器 ID（确保不冲突）
HOSTNAME="nanoai-web"
STORAGE="local-lvm"         # PVE 存储名称，按实际调整
BRIDGE_INT="vmbr0"          # 内网桥接
BRIDGE_VPN="vmbr1"          # VPN 桥接（按实际调整）
IP_INT="10.10.10.31/24"
GW_INT="10.10.10.1"
IP_VPN="100.100.10.31/24"
GW_VPN="100.100.10.1"
DNS="8.8.8.8"
PASSWORD="nanoai2026"       # LXC root 密码，按需修改
SSH_KEY="$(cat ~/.ssh/id_ed25519.pub)"

echo "=== [1/5] 下载 Debian 13 模板 ==="
# 查找可用模板
pveam list local | grep debian || {
    echo "下载 debian-13 模板..."
    pveam update
    # Debian 13 (trixie) 尚未正式发布时可能需要用 debian-12 并升级
    TEMPLATE=$(pveam list local | grep -oP 'debian-1[23]-standard_\d+\.\d+-\d+_amd64\.tar\.[gz]+' | head -1)
    if [ -z "$TEMPLATE" ]; then
        echo "未找到本地模板，尝试下载..."
        pveam download local debian-12-standard
        TEMPLATE=$(pveam list local | grep -oP 'debian-12-standard_\S+_amd64\.tar\.[gz]+' | head -1)
    fi
    echo "使用模板: $TEMPLATE"
}

TEMPLATE=$(pveam list local | grep -oP 'debian-1[23]-standard_\S+_amd64\.tar\.[gz]+' | head -1)
echo "模板: $TEMPLATE"

echo "=== [2/5] 创建 LXC 容器 ==="
pct create "$CTID" "local:vztmpl/$TEMPLATE" \
    --hostname "$HOSTNAME" \
    --cores 2 \
    --memory 2048 \
    --swap 512 \
    --storage "$STORAGE" \
    --rootfs "${STORAGE}:20" \
    --net0 "name=eth0,bridge=${BRIDGE_INT},ip=${IP_INT},gw=${GW_INT}" \
    --net1 "name=eth1,bridge=${BRIDGE_VPN},ip=${IP_VPN},gw=${GW_VPN}" \
    --nameserver "$DNS" \
    --searchdomain "" \
    --ssh-public-keys /dev/stdin <<< "$SSH_KEY" \
    --password "$PASSWORD" \
    --unprivileged 1 \
    --features "nesting=1" \
    --onboot 1 \
    --start 1

echo "=== [3/5] 启动容器 ==="
pct start "$CTID" 2>/dev/null || echo "容器已启动"

echo "=== [4/5] 等待网络就绪 ==="
sleep 5
pct exec "$CTID" -- bash -c "ping -c 2 $DNS && echo '网络OK'" || echo "⚠️ 网络未就绪，检查配置"

echo "=== [5/5] 验证 SSH ==="
echo "测试 SSH 连接..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@10.10.10.31 "echo 'SSH 连接成功'" || {
    echo "⚠️ SSH 未就绪，尝试通过 pct enter..."
}

echo ""
echo "============================================"
echo "✅ LXC 容器创建完成"
echo "   CTID:     $CTID"
echo "   内网 IP:  $IP_INT"
echo "   VPN IP:   $IP_VPN"
echo "   SSH:      ssh root@10.10.10.31"
echo "   密码:     $PASSWORD"
echo "============================================"
