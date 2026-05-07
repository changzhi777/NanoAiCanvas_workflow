# Workflow 页面优化 - 侧栏/引导/模版拆分

**创建时间**: 2026-05-07 11:55:28
**状态**: 待执行

## 任务概述

1. 左侧栏默认收缩
2. 新用户 Tooltip Tour 引导
3. 18 个 Skills 模版拆分为独立文件

---

## 执行计划

### Step 1: 侧栏默认收缩
- **文件**: `src/components/nanoai-workflow/NanoaiWorkflowCanvas.tsx`
- **改动**: 第 52 行 `useState` 初始值 `false` → `true`
- **预期**: 首次打开时侧栏收缩，用户可通过 F2 或按钮展开

### Step 2: 新手引导组件 OnboardingTour
- **新建文件**: `src/components/nanoai-workflow/OnboardingTour.tsx`
- **实现要点**:
  - 配置 5 步引导: 侧栏节点 → 画布区域 → 属性面板 → 模板按钮 → 执行按钮
  - Overlay + 高亮 + 气泡定位
  - localStorage 键 `nanoai-onboarding-completed` 标记完成
  - 支持跳过、上一步、下一步
- **集成**: 在 `NanoaiWorkflowCanvas.tsx` 中引入，条件渲染
- **预期**: 新用户首次进入自动播放引导，完成后不再触发

### Step 3: Skills 模版拆分
- **新建目录**: `src/components/nanoai-workflow/templates/skills/`
- **拆分结构**:
  ```
  skills/
  ├── createSkillsWorkflow.ts      # 工厂函数（从原文件提取）
  ├── ui-mockups.ts                # 模版 1
  ├── product-visuals.ts           # 模版 2
  ├── maps.ts                      # 模版 3
  ├── slides.ts                    # 模版 4
  ├── poster.ts                    # 模版 5
  ├── portraits.ts                 # 模版 6
  ├── scenes.ts                    # 模版 7
  ├── editing.ts                   # 模版 8
  ├── avatars.ts                   # 模版 9
  ├── storyboards.ts               # 模版 10
  ├── grids.ts                     # 模版 11
  ├── branding.ts                  # 模版 12
  ├── typography.ts                # 模版 13
  ├── assets.ts                    # 模版 14
  ├── academic.ts                  # 模版 15
  ├── infographics.ts              # 模版 16
  ├── technical.ts                 # 模版 17
  ├── complete.ts                  # 模版 18
  └── index.ts                     # 统一导出 skillsWorkflowTemplates
  ```
- **修改**: `src/stores/nanoaiWorkflowStore.ts` 更新 import 路径
- **删除**: 原 `src/components/nanoai-workflow/templates/skillsWorkflowTemplates.ts`
- **预期**: 功能不变，每个模版可独立定制

---

## 技术约束
- 不引入外部库（引导组件自建）
- 保持现有模板 API 兼容性
- 新手引导仅首次触发，不干扰老用户
