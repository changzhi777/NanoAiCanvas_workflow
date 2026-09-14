# nano2 TVC 视频模块

**创建时间**: 2026-05-17 12:00:22
**状态**: 执行中

## 需求
- nano2 页面新增 TVC 模式，顶部 Tab 切换（生图/TVC）
- 输入支持：文案、文案+参考图上传、从资产库选择图片
- 视频 Provider：后端自动路由为默认，高级选项可手动切换
- 集成 TVC 完整流程：文案→剧本→分镜→图片→视频→成片

## 方案
- 方案 1：TVC 独立面板 + Store 驱动（Zustand）
- 新建 `useTvcStore` + `Nano2TvcPanel`
- 复用现有：`TvcExecutionPanel`、`TvcProjectPanel`、`TvcProjectDetail`、`tvcApi`、`tvcProjectsApi`

## 步骤
1. 新建 `src/stores/tvcStore.ts` — Zustand Store
2. 新建 `src/components/Nano2TvcPanel.tsx` — 主面板
3. 更新 `src/components/Nano2Header.tsx` — 模式切换
4. 更新 `src/app/nano2/page.tsx` — 页面入口
5. 积分预检 + Provider 降级（内联在 store）
6. 资产选择集成（内联在面板）

## 文件变更
| 操作 | 文件 |
|------|------|
| 新建 | `src/stores/tvcStore.ts` |
| 新建 | `src/components/Nano2TvcPanel.tsx` |
| 修改 | `src/components/Nano2Header.tsx` |
| 修改 | `src/app/nano2/page.tsx` |
