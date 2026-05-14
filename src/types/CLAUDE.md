# Types 模块 - TypeScript 类型定义

> 导航面包屑：[根目录](../../CLAUDE.md) > **types**

**最后更新**: 2026-05-14
**文件数**: 9

---

## 文件清单

| 文件 | 行数 | 描述 |
|------|------|------|
| `index.ts` | 417 | 核心类型（NodeType 枚举、StoryboardAsset、User、CanvasState 等） |
| `image.ts` | 207 | 图片生成统一类型（ImageModelId、ImageGenerationRequest/Response、各模型参数） |
| `plugin.ts` | 131 | 插件系统类型（PluginNodePort、PluginNodeType、PluginManifest） |
| `shortcuts.ts` | 80 | 快捷键类型（KeyCombo、ShortcutCategory、ShortcutAction） |
| `admin.ts` | 88 | 管理后台类型（Provider、Model、APIKey、UserAdmin 等） |
| `collaboration.ts` | 71 | 协作类型（CollaborativeUser、CursorPoint、RemoteAction） |
| `themes.ts` | 72 | 主题类型（NodeTheme、ThemePreset、OKLCH 颜色） |
| `workflow-node-config.ts` | 28 | 节点执行配置（NodeExecutionConfig、timeout） |
| `customFields.ts` | 23 | 自定义字段类型（CustomField、CustomFieldType） |

---

## 关键导出

- **`NodeType` 枚举** — task / event / milestone / decision / data / start / end
- **`ImageModelId` 联合类型** — nano-banana2 | nano-banana-pro | gpt-image-2 | jimeng | minimax
- **`StoryboardAsset` 接口** — 资产核心数据结构
- **`PluginNodePort` 接口** — 节点端口定义（输入/输出）
- **`User` 接口** — 用户数据结构
- **`CanvasState` 接口** — 画布状态

---

**维护者**: BB小子 🤙
