# NanoAiCanvas LXC 部署计划

## 状态：✅ 已完成
## 日期：2026-06-07

## 执行结果

### 阶段 A：PVE 创建 LXC 容器 ✅
- [x] A1. SSH 免密设置（本地→跳板机→PVE→LXC 全链路）
- [x] A2. PVE 创建 LXC 131（Debian 13, 2C/2G/20G, local-zfs）
- [x] A3. Tailscale TUN 设备支持（cgroup2 + /dev/net 挂载）

### 阶段 B：基础环境 ✅
- [x] B1. 阿里云镜像源 + DNS (223.5.5.5)
- [x] B2. Node.js 20 LTS + pnpm
- [x] B3. Nginx + Python3 + venv + build-essential
- [x] B4. Tailscale VPN (100.100.10.31)

### 阶段 C：部署项目 ✅
- [x] C1. git clone 到 /opt/nanoai
- [x] C2. 前端 pnpm build
- [x] C3. 后端 venv + pip install

### 阶段 D：配置与验证 ✅
- [x] D1. Nginx 反代（/nanoaicanvas/ → 静态, /api/ → 后端 8000）
- [x] D2. Systemd 服务（nanoai-backend.service）
- [x] D3. .env 配置（PG: 10.10.10.11, Redis: 10.10.10.13）
- [x] D4. 数据库迁移（alembic upgrade head）
- [x] D5. PostgreSQL 建库建用户（nanoai/nanoai2026）

### 阶段 E：优化 ✅
- [x] E1. uvloop + httptools 性能优化
- [x] E2. 2G swapfile 防止 OOM
- [ ] E3. PG 编码 SQL_ASCII → UTF8（待执行）

## 访问地址
- 内网：http://10.10.10.31/nanoaicanvas/
- VPN：http://100.100.10.31/nanoaicanvas/
