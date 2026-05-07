# 变更日志（CHANGELOG）

> NanoAiCanvas Workflow 项目的版本变更记录

**格式**: 基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)

---

## [Unreleased]

### 计划中
- 添加单元测试（目标覆盖率：80%+）
- 完善文档中心
- 添加更多工作流模板
- 性能优化和监控

---

## [0.1.1] - 2026-04-22

### 🎯 项目定位
- **重大变更**: 项目定位从"无限画布应用"更新为"**Workflow 任务工作流系统**"
- 突出核心的 Workflow 功能和 AI 集成能力

### 🔄 配置更新
- **GitHub 仓库**: 迁移至 https://github.com/changzhi777/NanoAiCanvas_workflow
- **版本管理**: 采用新的版本号规则（V0.1.1 格式）
- **作者信息**: 统一为"外星动物（常智）/ IoTchange"
- **版权声明**: Copyright (C) 2026 IoTchange - All Rights Reserved

### 📚 文档完善
- ✅ 完整的 AI 上下文文档系统（100% 覆盖率）
- ✅ 识别 10 个主要模块和 93+ 核心文件
- ✅ Workflow 系统完整分析（9 种节点类型 + 4 个内置模板）
- ✅ 双重状态管理架构识别（Redux Toolkit + Zustand）
- ✅ 目录管理规则和文档中心
- ✅ 版本管理规则文档

### 📁 目录管理
- **根目录清理**: 移动 64 个 .md 文件到 `docs/` 目录
- **文档分类**: reports/, guides/, features/, deployment/, versions/, archive/
- **管理规则**: 建立严格的目录管理规范
- **自动检查**: pre-commit hook 自动验证根目录整洁性

### 🎨 功能特性
- **Workflow 系统**: 9 种节点类型（输入、AI 生成、决策、输出）
- **内置模板**: 4 个预置工作流模板
- **智能布局**: 拓扑排序和自动布局算法
- **可视化执行**: 实时状态追踪（idle → running → success/error）
- **双重状态管理**: Redux Toolkit（全局）+ Zustand（Workflow）

### 🏷️ 关键词优化
- 新增 8 个 workflow 相关关键词
- 优化 SEO 和项目可发现性

### 📊 技术栈
- React 19.2.4
- TypeScript 5.9.3
- Vite 5.2.11
- Redux Toolkit 2.2.5
- Zustand (Workflow 状态管理)
- React Flow 11.11.4
- Framer Motion 12.38.0

### ✅ 质量保证
- 根目录检查完全通过
- 文档一致性检查通过
- 目录管理规则严格执行

---

## 版本管理说明

### 版本号格式

```
V主版本号.次版本号.修订号
```

### 更新规则

- **修订号（第 3 位）**: 每次推送自动 +1
  - Bug 修复
  - 代码小改进
  - 文档更新

- **次版本号（第 2 位）**: 人工决策 +1
  - 新功能添加
  - 新节点类型
  - 新工作流模板

- **主版本号（第 1 位）**: 团队讨论 +1
  - 重大架构变更
  - 不兼容的 API 修改

### 示例

```
0.1.1 → 0.1.2 → 0.1.3 (修订号自动更新)
0.1.9 → 0.2.0 (次版本号更新)
0.9.9 → 1.0.0 (主版本号更新)
```

---

## 链接

- **GitHub 仓库**: https://github.com/changzhi777/NanoAiCanvas_workflow
- **版本管理规则**: [docs/VERSION_MANAGEMENT_RULES.md](docs/VERSION_MANAGEMENT_RULES.md)
- **项目说明**: [README.md](README.md)
- **AI 上下文**: [CLAUDE.md](CLAUDE.md)

---

**维护者**: 外星动物（常智）/ IoTchange
**最后更新**: 2026-04-22
