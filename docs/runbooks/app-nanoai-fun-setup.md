# Runbook: app.nanoai.fun 配置

## 背景

生产 server `43.129.205.22`（`opt/nanoai` 仓库）跑全栈 TVC 链路。需要把 `app.nanoai.fun` 指向该 IP，让终端用户通过子域访问。

## 已完成（2026-09-15）

### 1. DNSPod A 记录

- 控制台：https://console.dnspod.cn
- 域名：`nanoai.fun`
- 子记录：`app`
- 记录类型：A
- 线路：默认
- 记录值：`43.129.205.22`
- TTL：600
- DNSPod 凭证变更需在控制台「用户中心 → 安全设置 → API Token」重置

### 2. Caddyfile vhost（`/opt/zhiming/deploy/Caddyfile`）

```caddyfile
app.nanoai.fun {
    encode gzip zstd
    handle /api/* {
        reverse_proxy nanoai-nginx-1:80
    }
    handle /assets/* {
        header Cache-Control "public, max-age=2592000"
    }
    handle /nanoai/* {
        reverse_proxy nanoai-nginx-1:80
    }
    handle {
        reverse_proxy nanoai-frontend-1:80
    }
}
```

### 3. Caddy 容器网络（关键修复）

`deploy-caddy-1` 原本只在 `deploy_default` 网络，`nanoai-frontend-1` 解析失败 → 502。
**修复**：`docker network connect nanoai_default deploy-caddy-1`

## 永久化（防重启丢）

### docker-compose.yml 加网络

```yaml
# /opt/zhiming/deploy/docker-compose.yml
services:
  caddy:
    image: caddy:2-alpine
    networks:
      - default
      - nanoai_default
    # ... 其它保持
```

`nanoai_default` 是 `/opt/nanoai/docker-compose.yml` 里的网络名。

## 验证

```bash
# 1. DNS 解析
dig app.nanoai.fun +short @119.29.29.29
# 期望: 43.129.205.22

# 2. HTTPS 端到端
curl -sk -o /dev/null -w "%{http_code}\n" https://app.nanoai.fun/nanoai/health
# 期望: 200

# 3. ACME 证书
docker exec deploy-caddy-1 find /data -name "app.nanoai.fun*" 2>/dev/null
```

## 验证脚本

`scripts/dns/verify_app_nanoai.sh` 一键验证（DNS 解析 + HTTP 探活 + 前端/后端可达）。

## 已知坑

1. **DNSPod 控制台有重置链接** — 改 token 后旧脚本失效
2. **ACME 首次签发需 30s-2min** — 之后 60 天自动续期
3. **caddy network connect 在 docker compose restart 后会丢** — 必须永久化到 docker-compose.yml

## 关联

- `scripts/dns/point_app_nanoai.py` — DNSPod API 改 A 记录
- `scripts/dns/verify_app_nanoai.sh` — DNS + HTTPS 验证
- `/opt/zhiming/deploy/Caddyfile` — 知命 Caddyfile（独立仓库）
- `/opt/nanoai/docker-compose.yml` — nanoai 仓库（build 链）
