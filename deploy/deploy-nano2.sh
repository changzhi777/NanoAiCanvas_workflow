#!/usr/bin/env bash
# deploy-nano2.sh — NanoAI 文生图模块(nano2) → inkforge.com.cn/nano2 一键构建部署
# 用法: bash deploy/deploy-nano2.sh          # 构建 + 部署
#       bash deploy/deploy-nano2.sh --skip-build   # 跳过构建直接部署(须先 pnpm build)
#
# 架构(2026-10-16 首次落地):
#   浏览器 → https://inkforge.com.cn/nano2 (118 Caddy)
#     ├─ /nano2              → 118 /srv/nano2-frontend (SPA, App.tsx 认裸 /nano2 路径)
#     ├─ /nanoai/assets|favicon|logo → 118 本地静态 (strip /nanoai)
#     ├─ /nanoai/*           → https://nanoai-api.inkforge.com.cn (43.129 Caddy → nanoai-nginx:80)
#     │                        剥 /nanoai 前缀保留 /api 段(镜像 91zm nginx 剥法), VITE_API_BASE_URL=/nanoai/api
#     ├─ /v2/*               → 同上游 (前端 NanoBanana adapters 硬编码裸 /v2/image/*)
#     └─ /api/v2/tvc-video-agent* → 同上游 (video-editor-api SSE 硬编码, 截胡防落墨笔 saas)
#   前提(一次性, 已配好勿动):
#     - DNS: nanoai-api.inkforge.com.cn A 43.129.205.22 (DNSPod inkforge 域账号)
#     - 43.129: /opt/zhiming/repo/deploy/Caddyfile + /opt/zhiming/deploy/Caddyfile 双副本
#       追加 nanoai-api.inkforge.com.cn { reverse_proxy nanoai-nginx-1:80 } + caddy reload (commit 355f678)
#     - 118: /etc/caddy/Caddyfile inkforge.com.cn 块含 nano2 handle 组(备份 Caddyfile.bak-nano2-*)
set -euo pipefail

SERVER="root@118.89.29.6"
KEY="${KEY:-$HOME/Downloads/CZ.pem}"
DEST="/srv/nano2-frontend"
SKIP_BUILD=0
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=1

cd "$(dirname "$0")/.."

if [[ $SKIP_BUILD -eq 0 ]]; then
  echo "── 构建 (VITE_API_BASE_URL=/nanoai/api) ──"
  VITE_API_BASE_URL=/nanoai/api pnpm build
fi
[[ -f dist/index.html ]] || { echo "✗ dist/index.html 不存在, 先构建"; exit 1; }

echo "── 打包 (排除 macOS 垃圾) ──"
TAR=/tmp/nano2-nanoai-dist.tar.gz
COPYFILE_DISABLE=1 tar --exclude='._*' -czf "$TAR" -C dist .

echo "── 上传 + 清空式部署 → $SERVER:$DEST ──"
scp -o StrictHostKeyChecking=no -o BatchMode=yes -i "$KEY" "$TAR" "$SERVER:/tmp/" 2>&1 | grep -v LIBARCHIVE || true
ssh -o StrictHostKeyChecking=no -o BatchMode=yes -i "$KEY" "$SERVER" "
  find $DEST -mindepth 1 -delete
  tar -xzf /tmp/nano2-nanoai-dist.tar.gz -C $DEST 2>/dev/null
  rm -f /tmp/nano2-nanoai-dist.tar.gz
  echo '文件数:' \$(find $DEST -type f | wc -l)
"

echo "── 验证 ──"
sleep 1
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://inkforge.com.cn/nano2)
[[ "$code" == "200" ]] && echo "✓ https://inkforge.com.cn/nano2 → 200" || { echo "✗ /nano2 → $code"; exit 1; }
r=$(curl -s --max-time 15 -X POST https://inkforge.com.cn/nanoai/api/auth/login -H 'Content-Type: application/json' -d '{}' -o /dev/null -w "%{http_code}")
[[ "$r" == "422" || "$r" == "401" ]] && echo "✓ V1 API 链路 → $r (到达后端)" || echo "⚠ V1 API → $r (异常, 查 Caddy/上游)"
v=$(curl -s --max-time 15 -X POST https://inkforge.com.cn/v2/image/nanobanana2/generate -H 'Content-Type: application/json' -d '{}' -o /dev/null -w "%{http_code}")
[[ "$v" == "422" || "$v" == "401" ]] && echo "✓ V2 API 链路 → $v (到达后端)" || echo "⚠ V2 API → $v (异常)"
echo "── 完成 ──"
