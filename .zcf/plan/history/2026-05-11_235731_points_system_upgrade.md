# 积分管理系统升级计划

**创建时间**: 2026-05-11 23:35
**状态**: 执行中

## 目标
打通积分计价→扣费→用户感知完整链路

## 步骤
1. BillingRule 自动计价引擎 — `points.py` 增加 resolve_price + model_type 扣费
2. 积分服务层 — 新建 `points_service.py`，封装计价+扣费+记录
3. 积分不足前置校验 — `POST /points/check` + 前端校验
4. 画布余额显示 — 工具栏右侧积分 Badge
5. 用户端积分页面 — `/points` 页面
6. 管理后台统计仪表盘 — stats 接口 + DashboardTab

## 执行顺序
步骤1 → 步骤2 → 步骤3 → 步骤4 → 步骤5 → 步骤6
