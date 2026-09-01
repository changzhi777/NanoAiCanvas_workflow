#!/bin/bash
# ============================================
# NanoAiCanvas 部署脚本
# 在 LXC (10.10.10.31) 内执行
# ============================================
set -euo pipefail

PROJECT_DIR="/opt/nanoai"
BACKEND_DIR="${PROJECT_DIR}/backend"
REPO_URL="https://github.com/changzhi777/NanoAiCanvas_workflow.git"
BRANCH="main"

echo "=== [1/7] 克隆项目 ==="
if [ -d "${PROJECT_DIR}/.git" ]; then
    echo "项目已存在，拉取最新..."
    cd "$PROJECT_DIR"
    git pull origin "$BRANCH"
else
    git clone -b "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo "=== [2/7] 前端构建 ==="
cd "$PROJECT_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

echo "构建产物: $(ls -la dist/ | head -5)"

echo "=== [3/7] 后端 Python 虚拟环境 ==="
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== [4/7] 配置后端环境变量 ==="
if [ ! -f "${BACKEND_DIR}/.env" ]; then
    echo "⚠️  未找到 .env 文件，创建模板..."
    cat > "${BACKEND_DIR}/.env" << 'ENVEOF'
# === 数据库（连接 PVE 已有服务，按实际填写）===
POSTGRES_HOST=10.10.10.xxx
POSTGRES_PORT=5432
POSTGRES_DB=nanoai
POSTGRES_USER=nanoai
POSTGRES_PASSWORD=CHANGE_ME
SYNC_DATABASE_URL=postgresql://nanoai:CHANGE_ME@10.10.10.xxx:5432/nanoai

# === Redis ===
REDIS_HOST=10.10.10.xxx
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME

# === 安全 ===
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# === 上传目录 ===
UPLOAD_DIR=/opt/nanoai/asset-uploads
CHAT_UPLOAD_DIR=/opt/nanoai/chat-uploads
ENVEOF
    echo "⚠️  请编辑 ${BACKEND_DIR}/.env 填入真实的数据库连接信息"
fi

echo "=== [5/7] 数据库迁移 ==="
cd "$BACKEND_DIR"
source venv/bin/activate
cd alembic
alembic upgrade head || echo "⚠️ 迁移失败，请检查数据库连接"

echo "=== [6/7] 安装 Systemd 服务 ==="
cp "${PROJECT_DIR}/deploy/conf/nanoai-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable nanoai-backend

echo "=== [7/7] 安装 Nginx 配置 ==="
cp "${PROJECT_DIR}/deploy/conf/nginx-nanoai.conf" /etc/nginx/sites-available/nanoai
ln -sf /etc/nginx/sites-available/nanoai /etc/nginx/sites-enabled/nanoai
rm -f /etc/nginx/sites-enabled/default
nginx -t && echo "Nginx 配置OK" || echo "⚠️ Nginx 配置有误"

echo ""
echo "============================================"
echo "✅ 部署完成！"
echo ""
echo "启动命令："
echo "  systemctl start nanoai-backend"
echo "  systemctl restart nginx"
echo ""
echo "验证："
echo "  curl http://10.10.10.31/nanoai/"
echo "  curl http://10.10.10.31/health"
echo ""
echo "⚠️  别忘了编辑后端 .env:"
echo "  vi ${BACKEND_DIR}/.env"
echo "============================================"
