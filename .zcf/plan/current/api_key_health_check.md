# API Key 池健康检查系统

## 已完成
- [x] APIKey 模型新增 last_heartbeat_at, health_status, last_response_ms, last_error
- [x] Alembic 迁移 011
- [x] 后端心跳端点 POST /api-keys/{id}/heartbeat
- [x] 后端健康概览 GET /api-keys/health-summary
- [x] 后端 test_api_key 增强（保存完整测试结果+health_status）
- [x] 后台 Worker: health_checker.py (5分钟定时巡检 + 10分钟心跳超时标记)
- [x] main.py lifespan 集成
- [x] 前端 APIKey 类型 + 新接口 (heartbeat, health-summary)
- [x] 前端页面: 健康概览卡片, 健康状态列, 最近测试列, 心跳按钮, 测试结果弹窗

## 待部署
- 服务器执行 alembic upgrade head
- 重启后端
