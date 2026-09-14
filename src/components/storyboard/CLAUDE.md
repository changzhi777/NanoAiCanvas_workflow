[根目录](../../../../CLAUDE.md) > [src](../../) > [components](../) > **storyboard**

---

# Storyboard 模块 - 故事板组件集

> 故事板全流程 UI 组件：向导、资产预览、角色对话、语音合成、动画

**最后更新**: 2026-05-14
**文件数**: 25

---

## 模块职责

- 提供故事板创建向导（剧本 → 分镜 → 对话 → 角色）
- 管理角色卡片与对话编辑
- 集成语音合成与克隆功能
- 资产预览与图表展示
- 生成/预览/任务动画反馈

---

## 组件清单

### 核心

| 文件 | 职责 |
|------|------|
| `StoryboardPanel.tsx` | 故事板主面板，组合各 Tab 和向导 |
| `StoryboardWizard.tsx` | 故事板创建向导容器 |
| `index.ts` | 统一导出 |

### 向导步骤 (`wizard/`)

| 文件 | 职责 |
|------|------|
| `Step1Script.tsx` | 步骤1：剧本输入与生成 |
| `Step2Storyboard.tsx` | 步骤2：分镜生成与编辑 |
| `Step3Dialogue.tsx` | 步骤3：对话生成 |
| `Step4Character.tsx` | 步骤4：角色设计与分配 |
| `WizardStepper.tsx` | 向导步骤导航条 |

### 资产预览

| 文件 | 职责 |
|------|------|
| `AssetPreviewDialog.tsx` | 资产预览弹窗 |
| `StoryboardAssetCard.tsx` | 资产卡片（缩略图+信息） |
| `StoryboardAssetPreview.tsx` | 资产预览组件 |
| `StoryboardChartTab.tsx` | 图表数据 Tab |

### 角色 & 对话

| 文件 | 职责 |
|------|------|
| `CharacterCard.tsx` | 角色卡片展示 |
| `CharactersTab.tsx` | 角色列表 Tab |
| `CharacterVoiceMapping.tsx` | 角色→语音映射配置 |
| `DialogueItem.tsx` | 单条对话项 |
| `DialoguesTab.tsx` | 对话列表 Tab |
| `DialogueAudioList.tsx` | 对话音频列表播放 |

### 语音合成

| 文件 | 职责 |
|------|------|
| `VoiceClonePanel.tsx` | 语音克隆面板 |
| `VoiceSynthesisTab.tsx` | 语音合成 Tab |
| `ClonedVoiceList.tsx` | 已克隆语音列表 |
| `GlobalVoiceSettings.tsx` | 全局语音参数设置 |

### 动画

| 文件 | 职责 |
|------|------|
| `GenerationAnimation.tsx` | 生成过程动画 |
| `StoryboardPreviewAnimation.tsx` | 预览播放动画 |
| `StoryboardTaskAnimation.tsx` | 任务执行动画 |

---

## 数据流

```
StoryboardPanel
├── StoryboardWizard（创建流程）
│   ├── WizardStepper
│   ├── Step1Script → Step2Storyboard → Step3Dialogue → Step4Character
│   └── GenerationAnimation（生成中反馈）
├── CharactersTab（角色管理）
│   └── CharacterCard / CharacterVoiceMapping
├── DialoguesTab（对话管理）
│   └── DialogueItem / DialogueAudioList
├── VoiceSynthesisTab（语音合成）
│   ├── GlobalVoiceSettings
│   ├── VoiceClonePanel / ClonedVoiceList
│   └── StoryboardTaskAnimation
├── StoryboardChartTab（图表）
└── AssetPreviewDialog / StoryboardAssetCard（资产）
    └── StoryboardAssetPreview / StoryboardPreviewAnimation
```

---

## 关键依赖

- `react` / `react-redux` - UI 与状态
- `@/stores` - Zustand 状态管理
- `@/components/ui` - shadcn/ui 基础组件
- `@/lib/api` - API 客户端

---

## 目录结构

```
src/components/storyboard/
├── index.ts                       # 统一导出
├── StoryboardPanel.tsx            # 主面板
├── StoryboardWizard.tsx           # 向导容器
├── wizard/
│   ├── Step1Script.tsx
│   ├── Step2Storyboard.tsx
│   ├── Step3Dialogue.tsx
│   ├── Step4Character.tsx
│   └── WizardStepper.tsx
├── AssetPreviewDialog.tsx
├── StoryboardAssetCard.tsx
├── StoryboardAssetPreview.tsx
├── StoryboardChartTab.tsx
├── CharacterCard.tsx
├── CharactersTab.tsx
├── CharacterVoiceMapping.tsx
├── DialogueItem.tsx
├── DialoguesTab.tsx
├── DialogueAudioList.tsx
├── VoiceClonePanel.tsx
├── VoiceSynthesisTab.tsx
├── ClonedVoiceList.tsx
├── GlobalVoiceSettings.tsx
├── GenerationAnimation.tsx
├── StoryboardPreviewAnimation.tsx
└── StoryboardTaskAnimation.tsx
```

---

**文档维护**: 随模块更新同步维护
**生成者**: BB小子 🤙
