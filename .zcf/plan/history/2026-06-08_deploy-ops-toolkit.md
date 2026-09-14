# 部署运维工具包 — 已完成

## 完成时间：2026-06-08
## 状态：✅ 全部完成

## 交付物（9 个脚本）

### 测试
- test-deploy.sh: 29 项自动化测试 + HTML 报告
- test-cron.sh: 每天 8:00/20:00 定时测试
- tests/07-stress.sh: wrk 并发压测（首页/API/V2）

### 安全
- setup-https.sh: 自签证书 RSA2048/10年 + Nginx SSL（含回滚）

### 备份
- backup-restore.sh: PG 备份/恢复验证/定时(每天02:00)

### 日志
- setup-logrotate.sh: Nginx+后端+测试日志轮转(30天)

### 部署
- lxc-setup.sh: LXC 基础环境一键安装
- lxc-deploy.sh: 项目一键部署
- update.sh: git pull + build + 重启

## 访问
- HTTPS: https://10.10.10.31/nanoaicanvas/
- VPN:   https://100.100.10.31/nanoaicanvas/
- 健康:  https://10.10.10.31/health

## 服务器
- LXC 131 | Debian 13 | 2C/2G/20G | 10.10.10.31
- PG: 10.10.10.11:5432 (nanoai/nanoai2026)
- Redis: 10.10.10.13:6379 (redis_pass_2026)
