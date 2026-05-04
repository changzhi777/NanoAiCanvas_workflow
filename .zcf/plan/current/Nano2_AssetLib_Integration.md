# Nano2 Image 联动资产库功能 - 执行计划

**创建时间**：2026-05-03 05:30:00
**状态**：✅ 已完成

## 任务目标

1. ✅ 在 Nano2 Image 页面右侧增加资产库面板（Tab 切换）
2. ✅ 生成图片后自动保存到资产库
3. ✅ 故事板生成时可从资产库选择图片作为素材

## 执行步骤

### 步骤 1：修改 Nano2 Image 页面布局 ✅
- **文件**：`src/app/nano2/page.tsx`
- 右侧 HistoryPanel 改为 Tab 切换（历史记录 / 资产库）
- 新增 `rightPanelTab` state 控制切换

### 步骤 2：资产库面板组件 ✅
- **文件**：`src/components/ui/AssetLibrary/AssetLibraryPanel.tsx`（已存在）
- 复用现有组件，通过 selectionMode 控制选择模式

### 步骤 3：图片生成后自动保存 ✅
- **文件**：`src/components/GenerationPanel.tsx`
- 生图成功时 dispatch `image:generated` 事件，携带 images 和 prompt
- `src/app/nano2/page.tsx` 监听事件，调用 `assets.create()` 保存到资产库

### 步骤 4：故事板素材选择 ✅
- **文件**：`src/components/StoryboardDialog.tsx`
- 新增"从资产库选择素材"按钮
- 选中图片后通过 `addStoryboardImage()` 添加到故事板

### 步骤 5：Tab 切换 UI ✅
- History/AssetLib Tab 切换组件
- 两个面板独立，可按需切换

## 技术要点

- 使用 `useAssetLibStore` 和 `assets` API
- 资产分类：CHARACTER、SCENE、STORYBOARD、GENERAL
- 故事板素材通过 `addStoryboardImage()` 传递

## 页面访问

- Nano2 Image: http://localhost:3000/nano2
- 右侧面板可切换"历史"和"资产库"
- 故事板对话框有"从资产库选择素材"按钮