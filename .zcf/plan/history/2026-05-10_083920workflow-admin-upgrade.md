# Workflow 应用管理功能升级

> 创建时间：2026-05-10 08:10:52

## 任务描述
完善升级管理后台的 Workflow 应用管理功能 — 全面重构方案

## 方案
方案2：重构重建。后端数据库存储+审计日志，前端专业Dashboard布局。

## 执行计划

### 步骤 1：后端 — 数据库模型 + 迁移
- 新增 `backend/app/models/app_visibility.py`
  - `AppVisibilityItem` 表
  - `VisibilityAuditLog` 表
- Alembic 迁移 `010_app_visibility_tables.py`
- 注册到 `models/__init__.py`

### 步骤 2：后端 — 重写 API
- 重写 `backend/app/api/v2/app_visibility.py`
- CRUD + 批量操作 + 审计日志查询 + 重置 + JSON迁移

### 步骤 3：前端 — API 客户端升级
- 更新 `src/lib/api/app-visibility-api.ts`

### 步骤 4：前端 — 重构 Workflow 管理页面
- 重写 `src/app/admin/apps/workflow/page.tsx`
- 更新 `src/components/admin/apps/shared.tsx`

### 步骤 5：前端 — Store 适配
- 更新 `src/stores/appVisibilityStore.ts`

## 状态：执行中
