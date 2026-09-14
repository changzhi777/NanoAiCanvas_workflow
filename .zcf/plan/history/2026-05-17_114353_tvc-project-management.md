# TVC 项目化管理 + 团队资产共享

**创建时间**: 2026-05-17 11:20:49
**状态**: 执行完成，进入优化

## 目标
1. TVC 项目模型：将散落的脚本+镜头+视频+BGM 关联为项目
2. 内容层级展示：项目 → 剧本 → 镜头(prompt+图+视频) → 成片
3. 提示词溯源：每个镜头展示 video_prompt
4. 团队资产共享：个人资产导入团队

## 执行计划

### Phase 1: 后端数据模型 ✅
- [x] Step 1.1: `models/tvc_project.py` — TvcProject + TvcProjectShot
- [x] Step 1.2: `alembic/versions/014_tvc_projects.py` — 数据库迁移
- [x] Step 1.3: `models/__init__.py` + `user.py` — 注册新模型

### Phase 2: 后端 API ✅
- [x] Step 2.1: `api/v2/tvc_projects.py` — 8 个端点
- [x] Step 2.2: `api/teams.py` — +1 团队资产导入端点
- [x] `main.py` — 注册路由

### Phase 3: 前端 API 客户端 ✅
- [x] Step 3.1: `lib/api/tvc-projects-api.ts`

### Phase 4: 前端 UI ✅
- [x] Step 4.1: `ui/TvcProjectPanel.tsx` — 项目列表
- [x] Step 4.2: `ui/TvcProjectDetail.tsx` — 项目详情（剧本+镜头+提示词+成片）
- [x] Step 4.3: `ui/TeamAssetImport.tsx` — 团队资产导入

### Phase 5: 集成 ✅
- [x] Step 5.1: `useTvcExecution.ts` — 自动创建/更新 TvcProject
- [x] Step 5.2: `asset-auto-save.ts` — 关联 tvc_project_id
- [x] `TvcScriptNode.tsx` — result 类型添加 tvcProjectId
