# NanoAiCanvas LXC 部署计划

## 状态：执行中
## 日期：2026-06-07

## 网络拓扑
```
本地 → SSH 100.100.10.10（跳板机）→ PVE 10.10.10.10 → LXC 10.10.10.31 / 100.100.10.31
```

## 已确认信息
| 项目 | 值 |
|------|-----|
| LXC 类型 | 容器（非 VM） |
| OS | Debian 13 |
| 配置 | 2C / 2G / 20G |
| 内网 IP | 10.10.10.31/24 |
| VPN IP | 100.100.10.31 |
| PostgreSQL | PVE 已有（待查连接信息） |
| Redis | PVE 已有（待查连接信息） |
| 部署方式 | 裸机直装 |

## 部署方案：裸机直装
- 前端：pnpm build → Nginx 静态服务
- 后端：Python venv → uvicorn + systemd
- Nginx 反代：前端静态 + /api /v2 /ws → 后端 8000

## 关键配置发现
- 前端 base path: `/nanoaicanvas/`
- Nginx rewrite: `/nanoaicanvas/api` → `/api`, `/nanoaicanvas/auth` → `/api/auth`
- WebSocket: `/ws/` 需要 upgrade 头
- 后端端口: 8000
- Python: FastAPI + uvicorn + asyncpg + redis

## 执行步骤
- [x] A1. SSH 免密设置
- [ ] A2. PVE 创建 LXC
- [ ] B1. 基础环境安装
- [ ] B2. Node.js + pnpm
- [ ] B3. Nginx 配置
- [ ] C1. git clone 项目
- [ ] C2. 前端构建
- [ ] C3. 后端 venv + 依赖
- [ ] D1. 环境变量配置
- [ ] D2. 数据库迁移
- [ ] D3. 启动服务验证
- [ ] E1. VPN 网络配置
