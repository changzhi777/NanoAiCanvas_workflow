#!/bin/bash
# ============================================
# HTTPS 配置 — 自签证书
# 用法: bash setup-https.sh install|renew|uninstall|status
# ============================================
set -uo pipefail

DOMAIN="nanoai-web"
CERT_DIR="/etc/nginx/ssl"
DAYS=3650

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

case "${1:-install}" in
    install)
        echo "=== 1. 生成自签证书 ==="
        mkdir -p "$CERT_DIR"

        openssl req -x509 -nodes -days "$DAYS" -newkey rsa:2048 \
            -keyout "$CERT_DIR/$DOMAIN.key" \
            -out "$CERT_DIR/$DOMAIN.crt" \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=NanoAi/OU=Dev/CN=$DOMAIN" \
            -addext "subjectAltName=DNS:$DOMAIN,DNS:nanoai-web,IP:10.10.10.31,IP:100.100.10.31,IP:127.0.0.1" 2>/dev/null

        chmod 600 "$CERT_DIR/$DOMAIN.key"
        chmod 644 "$CERT_DIR/$DOMAIN.crt"
        echo -e "${GREEN}证书已生成 (有效期 ${DAYS} 天)${NC}"

        # 证书指纹
        FINGERPRINT=$(openssl x509 -fingerprint -sha256 -noout -in "$CERT_DIR/$DOMAIN.crt" | cut -d= -f2)
        echo "SHA256: $FINGERPRINT"

        echo "=== 2. 配置 Nginx HTTPS ==="
        cat > /etc/nginx/sites-available/nanoai-ssl << 'SSLEOF'
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/nanoai-web.crt;
    ssl_certificate_key /etc/nginx/ssl/nanoai-web.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 100m;

    # 前端静态文件
    location /nanoai/ {
        alias /opt/nanoai/dist/;
        index index.html;
        try_files $uri $uri/ /nanoai/index.html;
    }

    # API 代理
    location /nanoai/api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /nanoai/v2/ {
        proxy_pass http://127.0.0.1:8000/v2/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /nanoai/ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /nanoai/auth/ {
        proxy_pass http://127.0.0.1:8000/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /nanoai/chat-uploads/ { proxy_pass http://127.0.0.1:8000/chat-uploads/; }
    location /nanoai/asset-uploads/ { proxy_pass http://127.0.0.1:8000/asset-uploads/; }
    location /nanoai/health { proxy_pass http://127.0.0.1:8000/health; }

    # 直通路由
    location /api/ { proxy_pass http://127.0.0.1:8000/api/; proxy_set_header X-Forwarded-Proto $scheme; proxy_read_timeout 300s; }
    location /v2/ { proxy_pass http://127.0.0.1:8000/v2/; proxy_set_header X-Forwarded-Proto $scheme; proxy_read_timeout 300s; }
    location /ws/ { proxy_pass http://127.0.0.1:8000/ws/; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_read_timeout 86400; }
    location /health { proxy_pass http://127.0.0.1:8000/health; }

    location = / { return 302 /nanoai/; }
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
SSLEOF

        # 禁用纯 HTTP 配置，启用 HTTPS
        rm -f /etc/nginx/sites-enabled/nanoai
        ln -sf /etc/nginx/sites-available/nanoai-ssl /etc/nginx/sites-enabled/nanoai-ssl

        if nginx -t 2>/dev/null; then
            systemctl reload nginx
            echo -e "${GREEN}✅ HTTPS 配置完成${NC}"
            echo ""
            echo "访问地址:"
            echo "  https://10.10.10.31/nanoai/"
            echo "  https://100.100.10.31/nanoai/"
            echo ""
            echo "⚠️  浏览器会提示不安全（自签证书），点击继续即可"
        else
            # 回滚
            ln -sf /etc/nginx/sites-available/nanoai /etc/nginx/sites-enabled/nanoai
            rm -f /etc/nginx/sites-enabled/nanoai-ssl
            echo -e "${RED}❌ Nginx 配置错误，已回滚${NC}"
            nginx -t 2>&1
            exit 1
        fi
        ;;

    renew)
        openssl req -x509 -nodes -days "$DAYS" -newkey rsa:2048 \
            -keyout "$CERT_DIR/$DOMAIN.key" \
            -out "$CERT_DIR/$DOMAIN.crt" \
            -subj "/C=CN/ST=Shanghai/L=Shanghai/O=NanoAi/OU=Dev/CN=$DOMAIN" \
            -addext "subjectAltName=DNS:$DOMAIN,DNS:nanoai-web,IP:10.10.10.31,IP:100.100.10.31,IP:127.0.0.1" 2>/dev/null
        systemctl reload nginx
        echo -e "${GREEN}✅ 证书已重新生成${NC}"
        ;;

    uninstall)
        rm -f /etc/nginx/sites-enabled/nanoai-ssl /etc/nginx/sites-available/nanoai-ssl
        ln -sf /etc/nginx/sites-available/nanoai /etc/nginx/sites-enabled/nanoai
        rm -rf "$CERT_DIR"
        systemctl reload nginx
        echo -e "${GREEN}✅ HTTPS 已卸载，恢复 HTTP${NC}"
        ;;

    status)
        if [[ -f "$CERT_DIR/$DOMAIN.crt" ]]; then
            EXPIRE=$(openssl x509 -enddate -noout -in "$CERT_DIR/$DOMAIN.crt" | cut -d= -f2)
            SUBJECT=$(openssl x509 -subject -noout -in "$CERT_DIR/$DOMAIN.crt" | cut -d= -f2-)
            SAN=$(openssl x509 -ext subjectAltName -noout -in "$CERT_DIR/$DOMAIN.crt" 2>/dev/null | grep -oP 'IP Address:\K[\d.]+|DNS:\K[\w.-]+' | tr '\n' ', ')
            echo "域名: $SUBJECT"
            echo "到期: $EXPIRE"
            echo "SAN:  ${SAN%,}"
            echo "状态: 已启用"
        else
            echo "HTTPS 未配置"
        fi
        ;;

    *)
        echo "用法: $0 {install|renew|uninstall|status}"
        ;;
esac
