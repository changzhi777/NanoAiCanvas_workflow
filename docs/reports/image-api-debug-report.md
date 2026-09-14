# 前端文生图故障诊断报告

## 测试日期
2026-05-06

## 故障现象
前端点击"开始生成"后，任务在约3%进度时报错失败。

## 诊断结果

### 1. API 路由测试

| 端点 | 方法 | 测试结果 | 说明 |
|------|------|----------|------|
| `/api/wuyinkeji/async/image_nanoBanana2` | POST | ✅ 200 | 提交任务成功 |
| `/api/wuyinkeji/async/detail` | GET | ⚠️ 405 | **nginx 代理问题** |
| 直接 `api.wuyinkeji.com` | POST | ✅ 200 | 原始 API 正常 |
| 直接 `api.wuyinkeji.com` | GET | ✅ 200 | 原始 API 正常 |

### 2. 根本原因

**GET 请求 `/api/wuyinkeji/async/detail` 通过 nginx 代理时返回 405 Method Not Allowed**

nginx 配置问题：
- POST 请求正常代理
- GET 请求返回 nginx 405 页面而非代理到上游

### 3. 任务状态

| 任务ID | 状态 | 结果 |
|--------|------|------|
| `image_3dc6be1f-5589-4f90-a364-5ba3f4910082` | ✅ 成功 | 生成完成，返回图片 URL |

**结论**：后端到 wuyinkeji API 的连接正常，任务可以成功生成。问题在于 nginx 代理配置导致前端轮询失败。

### 4. 前端代码分析

前端 `suchuang-api.ts` 使用以下端点：
- 提交：`POST /api/wuyinkeji/async/image_nanoBanana2` ✅
- 查询：`GET /api/wuyinkeji/async/detail` ⚠️ **405错误**

## 修复方案

### 方案 1: 修复 nginx 配置（推荐）

在生产服务器 nginx 配置中添加 GET 方法代理：

```nginx
location /api/wuyinkeji/ {
    # 确保 GET 方法也被代理
    methods GET POST PUT DELETE OPTIONS;
    proxy_pass https://api.wuyinkeji.com/api/;
    ...
}
```

### 方案 2: 前端使用 V2 API 替代方案

如果 nginx 无法修改，前端需要改造使用新的 V2 API：
- 提交：`POST /v2/image/nanobanana2/generate` (需要 X-API-Key header)
- 查询：`GET /v2/image/nanobanana2/task/{task_id}` (需要 X-API-Key header)

### 方案 3: 实现 Redis 实时消息机制

无论哪种方案，同步实现 Redis Pub/Sub 实时推送机制，避免轮询。

---

## 实施步骤

1. [ ] 修复 nginx 配置或改造前端 API 调用
2. [ ] 实现 Redis Pub/Sub 任务状态推送
3. [ ] 前端 WebSocket 订阅实时状态
4. [ ] 端到端测试验证
