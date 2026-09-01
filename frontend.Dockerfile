# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# nginx配置：SPA路由 + API代理
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /nanoai/index.html;
    }

    # Nano2 独立入口 SPA fallback（前缀匹配，兼容 /nano2 和 /nano2/）
    location /nano2 {
        try_files $uri /nanoai/index.html;
    }

    # 管理后台 SPA fallback
    location /admin {
        try_files $uri /nanoai/index.html;
    }

    # Canvas SPA fallback
    location = /canvas {
        try_files $uri /nanoai/index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /v2/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }

    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /chat-uploads/ {
        proxy_pass http://backend:8000;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
EOF

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
