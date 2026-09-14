# NanoAiCanvas LXC 部署 — 已完成

## 完成时间：2026-06-07
## 状态：✅ 全部完成

## 部署结果

### 服务器
| 项目 | 值 |
|------|-----|
| VMID | 131 |
| Hostname | nanoai-web |
| OS | Debian 13 (trixie) |
| 配置 | 2C / 2G / 20G (local-zfs) |
| 内网 | 10.10.10.31/24 |
| VPN | 100.100.10.31 (Tailscale) |

### 数据库
| 服务 | 地址 | 认证 |
|------|------|------|
| PostgreSQL | 10.10.10.11:5432 | nanoai / nanoai2026 |
| Redis | 10.10.10.13:6379 | redis_pass_2026 |

### 完成事项
- [x] SSH 全链路免密（Mac→跳板→PVE→LXC）
- [x] LXC 创建 + Tailscale TUN 支持
- [x] 阿里云镜像源 + DNS
- [x] Node.js 20 + pnpm + Nginx + Python3
- [x] Tailscale VPN 认证
- [x] 前端 pnpm build + Nginx 反代
- [x] 后端 venv + uvicorn + systemd
- [x] PostgreSQL 建库（UTF8）+ Alembic 迁移
- [x] uvloop/httptools 性能优化
- [x] 2G swap 防止 OOM
- [x] SECRET_KEY 随机生成
- [x] 更新脚本 /opt/nanoai/update.sh

### 访问
- 内网：http://10.10.10.31/nanoaicanvas/
- VPN：http://100.100.10.31/nanoaicanvas/
- 健康：http://10.10.10.31/health

### 运维
```bash
ssh -J root@100.100.10.10 root@10.10.10.31  # SSH
bash /opt/nanoai/update.sh                    # 更新
journalctl -u nanoai-backend -f               # 日志
```
