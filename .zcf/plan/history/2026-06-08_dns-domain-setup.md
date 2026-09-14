# 内部域名配置 — 已完成

## 完成时间：2026-06-08

## 配置
- 内部域名: nanoai.qm.com → 10.10.10.31
- DNS 服务: LXC 105 (QM-dns-proxy-S1)
- 自动检测脚本: setup-dns.sh (支持 dnsmasq/CoreDNS/BIND/Unbound)
- Nginx: server_name 已加 nanoai.qm.com
- HTTPS: 自签证书 SAN 已加 DNS:nanoai.qm.com

## 最终访问地址
| 地址 | 用途 |
|------|------|
| https://nanoai.qm.com/nanoaicanvas/ | 内部域名（推荐）|
| https://10.10.10.31/nanoaicanvas/ | 内网 IP |
| https://100.100.10.31/nanoaicanvas/ | Tailscale VPN |
| https://nanoai.qm.com/health | 健康检查 |
