# 腾讯云香港生产部署 — 91zm.com.cn

> 状态：已完成（2026-08-29 DNS+HTTPS 收官） | 方案：Docker Compose（deploy.sh）| 基线：工作区 2.13.30
> 开始：2026-08-29 | 工作流：/zcf:workflow 6 阶段 | 会话重启后 Bash 已恢复，代理自执行

## 上下文

- 目标：腾讯云香港服务器 + 域名 91zm.com.cn（.cn 已实名则解析即生效，指向境外无需备案）
- 方案 1（Docker Compose）已批准；`setup-https.sh` 为自签证书（LXC 内网 SAN 10.10.10.31），公网不适用 → 宿主机 nginx + certbot（Let's Encrypt）替代
- 架构：宿主 nginx（80/443，certbot 证书）→ 反代 127.0.0.1:8080 → 容器 nginx（deploy/nginx-outer.conf 分发 / → frontend:3000，/api/ /v2/ /ws/ /health → backend:8000）
- compose 事实（已核实）：backend 全量 env_file .env；frontend 构建 VITE_API_BASE_URL=""（同源）；pgvector/pg16 + redis:7；HOST_PORT 映射容器 nginx

## 步骤清单

- [x] 0.1 归位四件套（CLAUDE.md ×2 / 本计划 / nginx-91zm.conf → deploy/conf/）
- [x] 0.2 .env 生成：PG/Redis/Secret 新生成（openssl rand），GLM/MiniMax 复用 backend/.env，CORS+FRONTEND_URL 域名化，HOST_PORT=8080，chmod 600，gitignore ✓
- [ ] 0.3 rsync → 服务器 /opt/nanoai（含 .git；排除 node_modules / backend/venv / dist / 11 / .playwright-mcp / __pycache__）
- [ ] 1.1 SSH 侦察（**阻塞：待用户提供服务器公网 IP**）
- [ ] 1.2 腾讯云安全组放行 22/80/443（控制台，用户操作）
- [ ] 1.3 安装 Docker + compose 插件
- [ ] 2.1 服务器 ./deploy/deploy.sh（build --parallel + up -d + /health 自检 15×5s）
- [ ] 2.2 curl http://127.0.0.1:8080/health
- [x] 3.1 DNS：91zm.com.cn A 记录 → 公网 IP（域名商/DNSPod 控制台，用户操作）
- [x] 3.2 宿主 nginx（deploy/conf/nginx-91zm.conf → /etc/nginx/sites-available/91zm）+ certbot --nginx -d 91zm.com.cn
- [x] 3.3 浏览器验证 https://91zm.com.cn
- [x] 4.1 bash deploy/test-deploy.sh 7 维度（若绑定旧 IP 现场适配）
- [x] 4.2 backup-restore.sh PG 每日备份 cron + setup-logrotate.sh
- [x] 4.3（保持默认白名单） ALLOWED_EMAIL_DOMAINS 复核（默认 caohua.com/nanoai.fun/qq.com）

## 风险登记

1. ~~CORS_ORIGINS 不含域名~~ → 已在 .env 解决（https://91zm.com.cn）
2. ~~VITE_API_BASE_URL 构建注入未验证~~ → 已核实 compose 传 ""（同源模式），链路通
3. **容器 nginx /api/ 段未关 proxy_buffering** → TVC SSE 进度若不动，在 nginx-outer.conf 对应 location 加 proxy_buffering off（外层宿主 nginx 已配 ✓）
4. VITE_WUYINKEJI_API_KEY 未注入构建 → 速创直连路径回退硬编码 key（独立待办：key 已泄露需轮换，见会话记录）
5. ALLOWED_EMAIL_DOMAINS 白名单可能挡住新用户注册 → 4.3 复核

## 复用命令

```bash
# rsync（IP 替换后执行）
rsync -avz --progress \
  --exclude node_modules --exclude backend/venv --exclude dist \
  --exclude 11 --exclude .playwright-mcp --exclude __pycache__ --exclude '*.pyc' \
  /Users/mac/cz_code/NanoAiCanvas_workflow/ root@<IP>:/opt/nanoai/

# SSH 侦察
ssh root@<IP> 'head -2 /etc/os-release; echo ---; free -h | sed -n 2p; echo ---; df -h / | sed -n 2p; echo ---; nproc; echo ---; docker --version 2>/dev/null || echo no-docker'
```

## 最终交付（2026-08-29）

- DNS：91zm.com.cn → 43.135.154.107（默认+境外双线路，旧 .22 记录已删）
- HTTPS：Let.s Encrypt 证书（至 2026-11-27，certbot 自动续期）
- 入口：https://91zm.com.cn/nanoai/（前端 base 重构 2.13.31）+ 根路径保留
- 运维：每日 3:00 PG 备份（7天滚动）+ logrotate
- 遗留：PVE 内网密码已入公网仓库历史（建议改密）
