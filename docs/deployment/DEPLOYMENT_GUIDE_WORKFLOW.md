# 部署与发布指南

> **项目**: NanoAiCanvas Storyboard  
> **版本**: 2.2.1  
> **部署环境**: Vercel / Docker / 静态托管

---

## 📦 部署前准备

### 1. 环境检查

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 检查 pnpm 版本
pnpm --version  # 应该 >= 8.0.0

# 检查依赖
pnpm list --depth=0
```

### 2. 构建测试

```bash
# 运行类型检查
pnpm run type-check

# 运行代码检查
pnpm run lint

# 运行测试
pnpm run test

# 构建生产版本
pnpm run build
```

### 3. 环境变量配置

创建 `.env.production` 文件：

```bash
# API 配置
VITE_API_BASE_URL=https://api.wuyinkeji.com/v1
VITE_API_KEY=dM2Gez6cbTHkRaKdoki5NBN3qc

# 应用配置
VITE_APP_NAME=NanoAiCanvas Storyboard
VITE_APP_URL=https://your-domain.com

# 分析配置
VITE_ENABLE_ANALYTICS=false
```

---

## 🚀 部署方式

### 方式 1: Vercel 部署（推荐）

#### 自动部署

1. **连接 GitHub 仓库**
   - 访问 https://vercel.com
   - 点击 "New Project"
   - 导入 GitHub 仓库

2. **配置项目**
   ```json
   {
     "name": "nanoai-canvas-storyboard",
     "buildCommand": "pnpm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "installCommand": "pnpm install"
   }
   ```

3. **环境变量**
   在 Vercel 控制台添加环境变量

4. **部署**
   - 推送到 `main` 分支自动触发部署
   - 或手动点击 "Deploy" 按钮

#### 手动部署

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录
vercel login

# 部署
vercel --prod

# 设置域名
vercel domains add nanoai.yourdomain.com
```

---

### 方式 2: Docker 部署

#### Dockerfile

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@8

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建
RUN pnpm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 构建和运行

```bash
# 构建镜像
docker build -t nanoai-canvas:latest .

# 运行容器
docker run -d -p 80:80 --name nanoai-canvas nanoai-canvas:latest
```

---

### 方式 3: 静态托管部署

#### 构建

```bash
pnpm run build
```

#### 部署到不同平台

**Netlify**
```bash
pnpm add -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

**GitHub Pages**
```bash
pnpm add -D gh-pages
# 在 package.json 添加脚本
pnpm run deploy:gh-pages
```

---

## 🔧 生产环境优化

### 1. 性能优化

#### 构建优化

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'reactflow-vendor': ['reactflow'],
          'ui-vendor': ['@radix-ui/react-dialog']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### 2. 安全配置

#### CORS 配置

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

---

## 📊 部署后检查清单

### 功能检查

- [ ] 页面正常加载
- [ ] 路由切换正常
- [ ] 节点添加功能
- [ ] 工作流执行功能
- [ ] 主题切换功能
- [ ] 模板加载功能

### 性能检查

- [ ] 首屏加载 < 3s
- [ ] 路由切换 < 500ms
- [ ] 节点添加 < 200ms
- [ ] 动画流畅（60 FPS）

---

## 🔄 CI/CD 配置

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Run tests
        run: pnpm test
        
      - name: Build
        run: pnpm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

**Be water, my friend! 🤙**

_最后更新: 2026-04-20_
