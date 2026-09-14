# 部署测试计划 — 已完成

## 完成时间：2026-06-08
## 状态：✅ 全部完成

## 交付物
- test-deploy.sh: 一键入口 + HTML 报告
- tests/01-network.sh: 4 项（DNS/网关/Tailscale/外网）
- tests/02-services.sh: 4 项（Nginx/Uvicorn/端口/配置）
- tests/03-frontend.sh: 4 项（HTML/JS/CSS/SPA fallback）
- tests/04-backend-api.sh: 5 项（/api /v2 /ws /health /nanoaicanvas）
- tests/05-database.sh: 6 项（PG连接/编码/迁移/并发 + Redis连接/延迟）
- tests/06-performance.sh: 6 项（响应时间/内存/磁盘/Swap/后端进程）
- test-cron.sh: 定时测试管理（每天 8:00/20:00）

## 总计：29 项自动化测试
## 优化：WebSocket防挂起 + PG并发 + Cron定时 + 报告清理30天

## 用法
```bash
# 手动测试
bash /opt/nanoai/deploy/test-deploy.sh --html

# 安装定时任务
bash /opt/nanoai/deploy/test-cron.sh install

# 查看状态
bash /opt/nanoai/deploy/test-cron.sh status
```
