[根目录](../CLAUDE.md) > **deploy**

---

# Deploy 模块 — 部署 / 运维工具链

> LXC / 裸机部署 + Docker Compose + Nginx + Systemd + HTTPS + DNS + 备份 + 日志轮转 + 部署测试 + 腾讯云香港生产（91zm.com.cn）

**最后更新**: 2026-09-01
**文件数**: 11 部署/运维脚本 + 7 测试脚本 + 5 配置文件（conf/×3 + nginx-outer.conf + .env 模板）

---

## 模块职责

`deploy/` 是生产部署与运维工具集，覆盖：
- **腾讯云香港生产**：nanoai-hk-2 主机 + 91zm.com.cn 域名 + HTTPS + `/nanoai` 入口（当前线上）
- **LXC 裸机部署**：PVE 创建 LXC 容器 → 容器内初始化 → 项目部署
- **Docker Compose 部署**：mini-s 单机配置，一键 up/down/logs/update
- **HTTPS 证书**：Let's Encrypt 自动签发
- **DNS 配置**：AdGuard DNS 或自定义 DNS 解析
- **数据备份与恢复**：PostgreSQL 定时备份 + 恢复测试
- **日志轮转**：logrotate 配置
- **部署验证**：7 维度自动化测试（网络/服务/前端/后端 API/数据库/性能/压力）

---

## 目录结构

```
deploy/
├── .env.mini-s.example             # Docker 部署环境变量模板
├── deploy.sh                       # Docker Compose 一键部署（update/down/logs）
├── pve-create-lxc.sh               # Proxmox 创建 LXC 容器
├── lxc-setup.sh                    # LXC 内基础环境（Node/Python/Redis/PG）
├── lxc-deploy.sh                   # LXC 内项目部署（7 步：克隆→构建→venv→配置→迁移→systemd→启动）
├── backup-restore.sh               # PostgreSQL 备份/恢复/定时任务/状态查询
├── setup-https.sh                  # Let's Encrypt HTTPS 证书签发
├── setup-dns.sh                    # 自定义 DNS 解析配置
├── setup-adguard-dns.sh            # AdGuard DNS 服务部署
├── setup-logrotate.sh              # logrotate 日志轮转配置
├── test-deploy.sh                  # 部署测试入口（一键运行 7 维度测试）
├── test-cron.sh                    # 定时任务验证
├── nginx-outer.conf                # 外层 Nginx 反向代理配置
├── conf/
│   ├── nginx-nanoai.conf           # NanoAI Nginx 站点配置（LXC 内网）
│   ├── nginx-91zm.conf             # 91zm.com.cn 香港生产反代（宿主机 → Docker 8080）★ 新增
│   └── nanoai-backend.service      # 后端 systemd unit
└── tests/                          # 7 维度部署测试
    ├── 01-network.sh               # 网络连通性
    ├── 02-services.sh              # 服务运行状态
    ├── 03-frontend.sh              # 前端可访问性
    ├── 04-backend-api.sh           # 后端 API 接口测试
    ├── 05-database.sh              # 数据库连接与表结构
    ├── 06-performance.sh           # 响应时延
    └── 07-stress.sh                # 并发压力测试
```

---

## 关键脚本

### deploy.sh — Docker Compose 部署

```bash
./deploy/deploy.sh           # 首次部署（build + up + 健康检查）
./deploy/deploy.sh update    # 增量更新（git pull + rebuild）
./deploy/deploy.sh down      # 停止所有服务
./deploy/deploy.sh logs      # 查看日志
```

**前置条件**：
- `.env` 文件存在（从 `.env.mini-s.example` 复制）
- 必填项：`POSTGRES_PASSWORD` / `REDIS_PASSWORD` / `SECRET_KEY` / `GLM_API_KEY`

### nginx-91zm.conf — 香港生产反代（2026-09-01 新增）

腾讯云香港宿主机 Nginx 站点配置（`/etc/nginx/sites-available/91zm`）：
- `91zm.com.cn:80` → `proxy_pass http://127.0.0.1:8080`（Docker HOST_PORT）
- `client_max_body_size 100m`（资产/图片大文件上传）
- WebSocket 升级（chat / agent 双向通信）
- `proxy_buffering off` + 300s 超时（SSE：TVC 工作流进度推送）
- 证书：`certbot --nginx -d 91zm.com.cn` 自动补 SSL 段

线上入口：`https://91zm.com.cn/nanoai`（前端子路径 `/nanoai`，由容器内 Nginx 剥前缀转后端）。

### lxc-deploy.sh — 裸机 7 步部署

在 LXC 或裸机内执行，7 步流程：
1. 克隆项目（已存在则 `git pull`）
2. 前端构建（`pnpm install` + `pnpm build`）
3. 后端 Python venv + 依赖
4. 配置后端 .env
5. 数据库迁移（`alembic upgrade head`）
6. systemd 服务注册
7. 启动 + 健康检查

### backup-restore.sh — 数据库备份

```bash
bash deploy/backup-restore.sh backup         # 生产备份（pg_dump -Fc）
bash deploy/backup-restore.sh test-restore   # 恢复到临时库验证
bash deploy/backup-restore.sh schedule       # 安装 cron 定时备份
bash deploy/backup-restore.sh status         # 查看备份文件列表
```

- 备份目录：`/opt/nanoai/backups/`
- 格式：PostgreSQL custom（`pg_dump -Fc`）
- 恢复测试库：`nanoai_test_restore`（不影响生产库）

### test-deploy.sh — 部署测试入口

```bash
bash deploy/test-deploy.sh           # 运行 7 维度测试
bash deploy/test-deploy.sh --html    # 生成 HTML 测试报告
```

7 维度测试由 `tests/01-07*.sh` 模块化组成，结果汇总（通过/失败/跳过/总计）。

---

## 关键依赖与配置

### 部署目标环境

| 项 | 值 |
|---|---|
| 生产（当前线上） | 腾讯云香港 nanoai-hk-2，域名 91zm.com.cn，HTTPS，入口 `/nanoai` |
| 生产反代 | 宿主机 Nginx（`conf/nginx-91zm.conf`）→ Docker `127.0.0.1:8080` |
| 内网 LXC | 10.10.10.31（PVE 宿主机创建） |
| PostgreSQL（内网） | 10.10.10.11:5432（独立节点） |
| 项目目录 | `/opt/nanoai` |
| 备份目录 | `/opt/nanoai/backups` |

### 必填环境变量

| 变量 | 用途 |
|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 密码 |
| `REDIS_PASSWORD` | Redis 密码 |
| `SECRET_KEY` | JWT 签名密钥 |
| `GLM_API_KEY` | 智谱 GLM API Key |

> 完整变量列表见 `deploy/.env.mini-s.example`

### systemd 服务

`deploy/conf/nanoai-backend.service`：
- 工作目录：`/opt/nanoai/backend`
- 启动命令：`/opt/nanoai/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000`
- 自动重启：`Restart=always`

---

## 测试与质量

### 部署测试矩阵

| 维度 | 文件 | 检查内容 |
|------|------|----------|
| 网络 | `01-network.sh` | 内外网连通性、DNS 解析、端口可达 |
| 服务 | `02-services.sh` | nginx / systemd / docker 服务状态 |
| 前端 | `03-frontend.sh` | 首页 HTTP 200、静态资源加载 |
| 后端 API | `04-backend-api.sh` | `/health`、`/api/auth/*`、关键端点 |
| 数据库 | `05-database.sh` | PG 连接、关键表存在、Alembic 版本 |
| 性能 | `06-performance.sh` | 首屏响应 < 阈值 |
| 压力 | `07-stress.sh` | 并发请求成功率 |

### 运行测试

```bash
bash deploy/test-deploy.sh           # 默认控制台输出
bash deploy/test-deploy.sh --html    # 生成 HTML 报告
```

退出码 = 失败数，便于 CI 集成。

---

## 常见问题 (FAQ)

### Q: LXC 与 Docker 部署如何选？
A: LXC（`lxc-deploy.sh`）适合长期生产、性能敏感场景；Docker（`deploy.sh`）适合快速验证、隔离环境。两者产物等价。当前线上为腾讯云香港 Docker 部署（91zm.com.cn）。

### Q: 如何修改 Nginx 配置？
A: 香港生产编辑 `deploy/conf/nginx-91zm.conf`（宿主机 91zm 站点）；内网 LXC 编辑 `deploy/conf/nginx-nanoai.conf` 或外层 `nginx-outer.conf`，重启 nginx。配置中已包含 WebSocket 升级、SSE 长连接（`proxy_buffering off`）、静态资源缓存。

### Q: 为什么线上入口是 /nanoai 子路径？
A: 前端 Vite `base: '/nanoai/'`（v2.13.3x 从 `/nanoaicanvas` 迁移而来），路由与资源路径统一走 `src/lib/basePath.ts`；Nginx 反代时剥离 `/nanoai` 前缀转发后端，API 保持同源相对路径。

### Q: 备份策略？
A: `backup-restore.sh schedule` 安装 cron（默认每日凌晨），保留最近 N 份；`test-restore` 验证备份可用性（不影响生产库）。

### Q: HTTPS 证书如何续期？
A: `setup-https.sh` 使用 Let's Encrypt，证书 90 天有效，certbot 默认安装 systemd timer 自动续期。91zm.com.cn 同样走 certbot（`certbot --nginx -d 91zm.com.cn`）。

---

## 相关文件清单

```
deploy/                                  # 11 脚本 + 7 测试 + 5 配置
├── deploy.sh / pve-create-lxc.sh / lxc-setup.sh / lxc-deploy.sh    # 部署链
├── backup-restore.sh / setup-https.sh / setup-dns.sh / setup-adguard-dns.sh / setup-logrotate.sh    # 运维
├── test-deploy.sh / test-cron.sh        # 部署测试
├── tests/01-network.sh ~ 07-stress.sh   # 7 维度测试模块
├── conf/nginx-nanoai.conf               # Nginx 站点配置（内网 LXC）
├── conf/nginx-91zm.conf                 # 91zm.com.cn 香港生产反代 ★
├── conf/nanoai-backend.service          # systemd unit
├── nginx-outer.conf                     # 外层反代
└── .env.mini-s.example                  # 环境变量模板
```

---

## 变更记录 (Changelog)

### 2026-09-01
- 新增 `conf/nginx-91zm.conf`：腾讯云香港生产（nanoai-hk-2 + 91zm.com.cn + HTTPS + `/nanoai` 入口）宿主机反代配置
- 记录香港生产拓扑：91zm.com.cn → 宿主机 Nginx → Docker 127.0.0.1:8080
- 记录前端子路径迁移 `/nanoaicanvas` → `/nanoai`（v2.13.3x）对部署的影响
- 文件统计修正：11 部署/运维脚本 + 7 测试 + 5 配置（原记 17 脚本 + 2 配置，口径重整）

### 2026-08-11
- 初始化模块文档
- 覆盖 17 部署脚本 + 7 测试脚本 + 2 配置文件
- 记录 LXC 10.10.10.31 / PG 10.10.10.11 部署拓扑

### 2026-06-07/08（项目级）
- LXC 裸机部署链（pve-create → lxc-setup → lxc-deploy）落地
- HTTPS + DNS + 备份 + 日志轮转 + 部署测试完整闭环
