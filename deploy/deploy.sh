#!/usr/bin/env bash
set -euo pipefail

# ============================================
# mini-s 一键部署脚本
# 用法:
#   ./deploy/deploy.sh          # 首次部署
#   ./deploy/deploy.sh update   # 增量更新（git pull + 重建）
#   ./deploy/deploy.sh down     # 停止所有服务
#   ./deploy/deploy.sh logs     # 查看日志
# ============================================

COMPOSE="docker compose"
ENV_FILE=".env"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_DIR"

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "❌ 未找到 .env 文件"
        echo "   cp deploy/.env.mini-s.example .env"
        echo "   然后填入实际配置值"
        exit 1
    fi

    # 检查必填项
    for var in POSTGRES_PASSWORD REDIS_PASSWORD SECRET_KEY GLM_API_KEY; do
        if grep -q "^${var}=\s*$" "$ENV_FILE" || ! grep -q "^${var}=" "$ENV_FILE"; then
            echo "❌ .env 中缺少必填项: $var"
            exit 1
        fi
    done
    echo "✅ 环境配置检查通过"
}

deploy() {
    echo "🚀 开始部署 mini-s..."
    check_env

    echo "📦 拉取最新代码..."
    git pull origin main 2>/dev/null || echo "   (本地模式，跳过git pull)"

    echo "🏗️  构建镜像..."
    $COMPOSE build --parallel

    echo "🔧 启动服务..."
    $COMPOSE up -d

    echo "⏳ 等待服务就绪..."
    sleep 10

    # 健康检查
    local retries=0
    local max_retries=15
    while [ $retries -lt $max_retries ]; do
        if curl -sf http://localhost:${HOST_PORT:-80}/health > /dev/null 2>&1; then
            echo "✅ 部署成功！"
            echo "   前端: http://$(hostname -I | awk '{print $1}'):${HOST_PORT:-80}"
            echo "   API:  http://$(hostname -I | awk '{print $1}'):${HOST_PORT:-80}/health"
            $COMPOSE ps
            return 0
        fi
        retries=$((retries + 1))
        echo "   等待后端启动... ($retries/$max_retries)"
        sleep 5
    done

    echo "⚠️  后端未在预期时间内启动，查看日志:"
    $COMPOSE logs backend --tail 30
    return 1
}

update() {
    echo "🔄 增量更新..."
    check_env

    echo "📦 拉取最新代码..."
    git pull origin main 2>/dev/null || echo "   (本地模式，跳过git pull)"

    echo "🏗️  重建变更的镜像..."
    $COMPOSE build --parallel

    echo "🔧 重启变更的服务..."
    $COMPOSE up -d --remove-orphans

    echo "🧹 清理旧镜像..."
    docker image prune -f 2>/dev/null || true

    echo "✅ 更新完成"
    $COMPOSE ps
}

down() {
    echo "⏹️  停止所有服务..."
    $COMPOSE down
    echo "✅ 服务已停止"
}

logs() {
    $COMPOSE logs -f --tail 100
}

case "${1:-}" in
    update)  update  ;;
    down)    down    ;;
    logs)    logs    ;;
    *)       deploy  ;;
esac
