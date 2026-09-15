#!/bin/bash
# app.nanoai.fun 改 DNS 后验证脚本
# 用法：bash scripts/dns/verify_app_nanoai.sh [IP]
# 默认 IP：43.129.205.22

set -e

DOMAIN="app.nanoai.fun"
TARGET_IP="${1:-43.129.205.22}"

echo "🔍 验证 $DOMAIN → $TARGET_IP"
echo

# 1. DNS 解析（dig + nslookup fallback）
echo "1) DNS 解析（dig）:"
if command -v dig &>/dev/null; then
  RESOLVED=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
  echo "   $DOMAIN → $RESOLVED"
elif command -v nslookup &>/dev/null; then
  RESOLVED=$(nslookup "$DOMAIN" 2>/dev/null | awk '/^Address: / {print $2; exit}')
  echo "   $DOMAIN → $RESOLVED"
else
  echo "   ⚠️  dig/nslookup 都不在，跳过"
  RESOLVED=""
fi

if [ "$RESOLVED" = "$TARGET_IP" ]; then
  echo "   ✅ DNS 解析正确"
else
  echo "   ⚠️  DNS 未指向 $TARGET_IP（当前 $RESOLVED）— 可能需等 TTL 600s"
fi
echo

# 2. HTTP 健康检查
echo "2) HTTP 健康检查:"
for proto in https http; do
  URL="$proto://$DOMAIN/nanoai/health"
  CODE=$(curl -s -o /tmp/health.body -w "%{http_code}" --max-time 15 "$URL" 2>/dev/null || echo "TIMEOUT")
  TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 15 "$URL" 2>/dev/null)
  echo "   $URL → HTTP $CODE (${TIME}s)"
done

# 3. 前端可访问
echo
echo "3) 前端可访问:"
HTML_CODE=$(curl -s -o /tmp/app.html -w "%{http_code}" --max-time 15 "https://$DOMAIN/nanoai/" 2>/dev/null)
HTML_TITLE=$(grep -oE '<title>[^<]+' /tmp/app.html 2>/dev/null | head -1)
echo "   https://$DOMAIN/nanoai/ → HTTP $HTML_CODE (title: $HTML_TITLE)"

# 4. 后端 API 健康
echo
echo "4) 后端 API 探活:"
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$DOMAIN/nanoai/health" 2>/dev/null)
echo "   https://$DOMAIN/nanoai/health → HTTP $API_CODE"

echo
echo "🎉 验证完成"
