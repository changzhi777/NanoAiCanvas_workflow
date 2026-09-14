#!/bin/bash
# ============================================
# LXC 基础环境安装
# 在新 LXC (10.10.10.31) 内执行
# ============================================
set -euo pipefail

echo "=== [1/6] 系统更新 ==="
apt update && apt upgrade -y

echo "=== [2/6] 基础工具 ==="
apt install -y \
    curl wget git \
    nginx \
    python3 python3-venv python3-pip \
    build-essential libpq-dev \
    gnupg ca-certificates \
    acl

echo "=== [3/6] 安装 Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm

echo "=== [4/6] 验证版本 ==="
node --version
pnpm --version
python3 --version
nginx -v

echo "=== [5/6] 创建项目目录 ==="
mkdir -p /opt/nanoai
mkdir -p /opt/nanoai/backend
mkdir -p /opt/nanoai/chat-uploads
mkdir -p /opt/nanoai/asset-uploads

echo "=== [6/6] 配置 Nginx ==="
# 停止默认站点
rm -f /etc/nginx/sites-enabled/default

echo ""
echo "============================================"
echo "✅ 基础环境安装完成"
echo "   Node.js: $(node --version)"
echo "   pnpm:    $(pnpm --version)"
echo "   Python:  $(python3 --version)"
echo "   Nginx:   $(nginx -v 2>&1)"
echo "============================================"
