# /nanoai 入口配置 — 部署审查与子路径改造

> 状态：已完成（2026-08-29） | 方案 1（全量改 base）已批准 | 开始：2026-08-29 11:11
> 工作流：/zcf:workflow 6 阶段 | 服务器：nanoai-hk-2（43.135.154.107）

## 上下文

- 部署审查完成：5 容器 Up / 29 测试绿 / 公网 200 / 备份+日志轮转就位 / DNS NS 传播中（独立线）
- 前端现状：`base: '/nanoaicanvas/'`（旧生产前缀）+ `src/lib/basePath.ts` BASE_PATH + 92 处路径引用
- 目标：NanoAiCanvas 挂 `/nanoai` 入口；原服务（根 /、/nano2、/canvas、/api 等）零改动
- 宿主 nginx（91zm.conf）`location /` 全转发 8080 — 无需改动，容器 nginx 做路径分发

## 步骤清单

- [x] A1 vite.config.ts base → '/nanoai/'
- [x] A2 basePath.ts BASE_PATH → '/nanoai'
- [x] A3 全仓 sed `/nanoaicanvas` → `/nanoai`（92 处，含 vite proxy）
- [x] A4 nginx-outer.conf 加 location /nanoai（复制 /nano2 SPA fallback 模式）
- [x] B1 pnpm build 全量验证
- [x] B2 grep 残留 = 0
- [x] C1 git commit（feat: /nanoai 入口）
- [x] C2 git push origin main
- [x] C3 服务器 git pull + rebuild frontend + up -d frontend（OrcaTerm）
- [x] C4 验证 http://43.135.154.107/nanoai/ → 200（公网验证 ✓）
- [x] D1 归档本计划 + 更新部署清单

## 风险登记

1. 旧 /nanoaicanvas/ 入口失效（方案 1 已批准取舍）
2. build 失败兜底：替换错误在 B1 暴露，git 可回滚
3. git push 含 LXC 密码的历史提交？— 否，本次提交仅路径重构文件
