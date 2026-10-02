# KFC TVC 云端展示页（Showcase）规划

> 状态：实施中（功能小、纯增量、无破坏性）
> 日期：2026-10-03

## 目标

替代本地临时播放页（localhost:18923）与速创临时直链：每单 TVC 生成一个**云端可分享的免登录展示页**（成片 + 参考图 + 验收报告），链接可直接发客户/群里。

## 方案（C：后端公开端点，自包含 HTML）

`GET /showcase/tvc/{task_id}`（FastAPI 公开路由，**无鉴权**只读；task_id 含 12 位随机 hex 不可枚举）

- 服务端渲染自包含 HTML（暗色品牌风、无外部依赖）：
  - 成片 `<video>`（**COS 转存持久 URL**，从 assets 表按 meta.task_id 取——不用速创临时链）
  - BGM 氛围片、参考图
  - 验收报告：双闸 score/状态/主要冲突点 + 重做计数（内部措辞精简版）
- 数据源：assets 表（产物 COS URL）+ tvc_acceptance_reports（报告）+ Redis state（fallback）
- 降级：无报告时只展示产物；无资产时用 Redis state 的原始 URL

## 实施步骤

1. `backend/app/api/v2/showcase.py`：公开路由 + HTML 渲染（~150 行）
2. main.py 注册（无鉴权，挂根路径 /showcase）
3. 报告卡（前端）加「分享页」小链接（可选，直接拼 URL 也可）
4. 部署验证：浏览器打开 showcase URL（免登录态验证）

## 验收标准

- 无痕浏览器打开 showcase URL 可播放成片、看参考图与报告
- COS URL 持久可访问；速创临时链失效后页面仍完整
- 单测：路由 200 + HTML 含关键元素（video/report）

## 非目标

- 不做权限/私享链接（后续可加 token 参数）
- 不做前端页面路由（自包含 HTML 即可分享）
