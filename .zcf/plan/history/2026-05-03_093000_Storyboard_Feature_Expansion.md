# 故事板功能扩展计划

**创建时间**：2026-05-03 07:30:00
**更新时间**：2026-05-03 09:00:00
**状态**：进行中

## 任务目标

1. 增加新节点类型（视频生成、背景音乐、转场）
2. 资产库增强（参考图选择、角色一致性）
3. 工作流集成（故事板节点 ↔ Workflow 联动）
4. 导出功能增强（视频预览、批量导出）

## 执行阶段

### 阶段 1：新节点类型 ✅
- 1.1 VideoGeneratorNode - 视频生成节点
- 1.2 BackgroundMusicNode - 背景音乐节点
- 1.3 TransitionNode - 转场效果节点

**完成时间**: 2026-05-03 08:30:00
**状态**: 已完成

### 阶段 2：资产库增强 ✅
- 2.1 AssetReferenceSelector - 参考图选择
- 2.2 CharacterConsistencyPanel - 角色一致性

**完成时间**: 2026-05-03 09:00:00
**状态**: 已完成

**实现内容**:
- `AssetReferenceSelector.tsx` - 参考图选择组件，支持分类筛选、搜索、多选
- `CharacterConsistencyPanel.tsx` - 角色一致性配置组件，支持多角色管理和特征选择
- 集成到 `StoryboardGeneratorNode.tsx`

### 阶段 3：工作流集成 ✅
- 3.1 故事板节点 ↔ Workflow 联动 ✅
- 3.2 数据共享机制 ✅

**完成时间**: 2026-05-03 09:15:00
**状态**: 已完成

**实现内容**:
- 在 `executeNode` 中添加了 `storyboard_generator` 执行逻辑，支持从上游节点获取脚本数据
- 添加了 `video_generator`、`background_music`、`transition` 节点的自动执行逻辑
- 更新了 `StoryboardGeneratorNode` 的 `handleExecute`，支持参考图和角色一致性配置
- 数据通过 `result.prompt` 传递完整提示词用于调试

### 阶段 4：导出增强 ✅
- 4.1 VideoPreview - 视频预览 ✅
- 4.2 BatchExport - 批量导出 ✅

**完成时间**: 2026-05-03 09:30:00
**状态**: 已完成

**实现内容**:
- 增强 `VideoGeneratorNode.tsx`：添加视频预览播放器，支持播放/暂停、进度条、下载、全屏
- 新增 `BatchExportPanel.tsx`：批量导出面板，支持多选、ZIP/文件夹格式导出

## 技术栈
- React 19.2.4 + TypeScript 5.9.3
- Zustand (状态管理)
- React Flow (节点编辑器)
- shadcn/ui (UI组件)

## 进度
- [x] 阶段 1 - 新节点类型
- [x] 阶段 2 - 资产库增强
- [x] 阶段 3 - 工作流集成
- [x] 阶段 4 - 导出增强

## 完成文件清单

### 新增文件
- `src/components/nanoai-workflow/nodes/VideoGeneratorNode.tsx`
- `src/components/nanoai-workflow/nodes/BackgroundMusicNode.tsx`
- `src/components/nanoai-workflow/nodes/TransitionNode.tsx`
- `src/components/ui/AssetLibrary/AssetReferenceSelector.tsx`
- `src/components/ui/AssetLibrary/CharacterConsistencyPanel.tsx`
- `src/components/ui/BatchExport/BatchExportPanel.tsx`

### 修改文件
- `src/components/nanoai-workflow/nodes/index.ts` - 添加新节点导出和注册
- `src/components/nanoai-workflow/nodes/StoryboardGeneratorNode.tsx` - 集成资产库组件
- `src/stores/nanoaiWorkflowStore.ts` - 添加 storyboard_generator、video_generator、background_music、transition 执行逻辑

## TypeScript 检查
所有新增文件已通过 `pnpm tsc --noEmit` 检查，无错误

## 技术栈
- React 19.2.4 + TypeScript 5.9.3
- Zustand (状态管理)
- React Flow (节点编辑器)
- shadcn/ui (UI组件)

## 进度
- [x] 阶段 1 - 新节点类型
- [x] 阶段 2 - 资产库增强
- [ ] 阶段 3 - 工作流集成
- [ ] 阶段 4 - 导出增强

## 完成文件清单

### 新增文件
- `src/components/nanoai-workflow/nodes/VideoGeneratorNode.tsx`
- `src/components/nanoai-workflow/nodes/BackgroundMusicNode.tsx`
- `src/components/nanoai-workflow/nodes/TransitionNode.tsx`
- `src/components/ui/AssetLibrary/AssetReferenceSelector.tsx`
- `src/components/ui/AssetLibrary/CharacterConsistencyPanel.tsx`

### 修改文件
- `src/components/nanoai-workflow/nodes/index.ts` - 添加新节点导出和注册
- `src/components/nanoai-workflow/nodes/StoryboardGeneratorNode.tsx` - 集成资产库组件
- `src/components/nanoai-workflow/nodes/VideoGeneratorNode.tsx` - 重构使用 ParamEditor
- `src/components/nanoai-workflow/nodes/BackgroundMusicNode.tsx` - 重构使用 ParamEditor
- `src/components/nanoai-workflow/nodes/TransitionNode.tsx` - 重构使用 ParamEditor

## TypeScript 检查
所有新增文件已通过 `pnpm tsc --noEmit` 检查，无错误