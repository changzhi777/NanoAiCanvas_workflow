[根目录](../../../../../CLAUDE.md) > [src](../../../../) > [components](../../../) > [admin](../../) > **apps**

---

# Admin Apps 模块 - 应用配置管理

> 管理后台应用配置组件，支持应用模块配置、模型选择

**最后更新**: 2026-05-15

---

## 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| AppConfigCard | `AppConfigCard.tsx` | 应用配置卡片组件 |
| ModelSelector | `ModelSelector.tsx` | 模型选择器（关联 Provider + Model） |
| shared | `shared.tsx` | 共享类型和工具函数 |
| index | `index.ts` | 导出 |

---

## 依赖

- `src/lib/api/admin-api.ts` — 管理后台 API
- `src/stores/appVisibilityStore.ts` — 可见性状态
- `src/stores/appsConfigStore.ts` — 应用配置

---

## 变更记录

### 2026-05-15
- 初始化模块文档
