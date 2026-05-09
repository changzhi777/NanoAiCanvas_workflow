# 应用管理独立与可见性控制

## 任务描述
清理所有工作流模板，通过三种可见性状态（active/disabled/hidden）控制模板、节点和 Nano 2 模块的可见性。将"应用管理"拆分为 Workflow 和 Nano 2 独立管理页面。

## 执行时间
2026-05-10

## 方案
方案 1：集中式状态管理（新建 appVisibilityStore）

## 已完成步骤

1. ✅ 创建 `src/stores/appVisibilityStore.ts` — 集中式可见性状态管理
2. ✅ 创建 `src/lib/api/app-visibility-api.ts` — 后端配置同步 API
3. ✅ 修改 `WorkflowTemplates.tsx` — 模板过滤（hidden 不显示，disabled 置灰）
4. ✅ 修改 `NanoaiWorkflowSidebar.tsx` — 节点过滤（hidden 不显示，disabled 置灰）
5. ✅ 修改 `GenerationPanel.tsx` + `Nano2Header.tsx` — Nano 2 模块过滤
6. ✅ 新建 `src/app/admin/apps/workflow/page.tsx` — Workflow 管理页面
7. ✅ 新建 `src/app/admin/apps/nano2/page.tsx` — Nano 2 管理页面
8. ✅ 修改 `AdminSidebar.tsx` — 导航拆分
9. ✅ 修改 `App.tsx` — 路由注册
10. ✅ 新建 `backend/app/api/v2/app_visibility.py` — 后端配置 API
11. ✅ 修改 `backend/app/main.py` — 注册路由

## 默认状态
- V1/V2 模板 → active
- 其余模板/节点 → disabled
- Nano 2 模块 → active
