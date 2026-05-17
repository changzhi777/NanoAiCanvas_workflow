[根目录](../../../../CLAUDE.md) > [src](../../../) > [components](../../) > [ui](../) > **AssetLibrary**

---

# AssetLibrary 模块 - 资产库管理

> 资产库 UI 组件集，支持搜索、分类、预览、引用选择、角色一致性等

**最后更新**: 2026-05-15

---

## 模块职责

- 资产浏览与搜索面板
- 资产预览（图片/视频/音频）
- 分类向导（CategoryWizard）
- 资产引用选择器（节点引用资产）
- 角色一致性面板（CharacterConsistencyPanel）
- 同步状态指示器

---

## 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| AssetLibraryPanel | `AssetLibraryPanel.tsx` | 资产库主面板，搜索+分类+列表 |
| AssetPreview | `AssetPreview.tsx` | 资产详情预览 |
| AssetSelector | `AssetSelector.tsx` | 资产选择器弹窗 |
| AssetReferenceSelector | `AssetReferenceSelector.tsx` | 节点引用资产选择器 |
| CategoryWizard | `CategoryWizard.tsx` | 分类向导，引导用户创建分类 |
| CharacterConsistencyPanel | `CharacterConsistencyPanel.tsx` | 角色一致性设置面板 |
| SyncStatusIndicator | `SyncStatusIndicator.tsx` | 离线同步状态指示 |

---

## 依赖

- `src/lib/api/assets.ts` — 资产 API
- `src/lib/db/AssetCache.ts` — IndexedDB 缓存
- `src/lib/sync/SyncEngine.ts` — 离线同步

---

## 变更记录

### 2026-05-15
- 初始化模块文档
