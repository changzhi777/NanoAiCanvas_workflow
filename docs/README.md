# 文档中心

> **NanoAiCanvas** - 基于无限画布的 Workflow 任务工作流系统

> NanoAiCanvas 项目的所有文档都在这里

**最后更新**: 2026-04-22
**维护者**: BB小子 🤙

---

## 📂 目录结构

```
docs/
├── README.md                    # 本文件
├── DIRECTORY_MANAGEMENT.md      # 🔴 目录管理规则（必读）
├── reports/                     # 报告和总结
│   ├── COMPLETE_OPTIMIZATION_REPORT.md
│   ├── FINAL-COMPLETION-REPORT.md
│   └── ...
├── guides/                      # 指南文档
│   ├── QUICK_START_GUIDE.md
│   ├── WORKFLOW_GUIDE.md
│   └── ...
├── features/                    # 功能文档
│   ├── ANIMATION_ENHANCEMENTS.md
│   ├── DESIGN.md
│   └── ...
├── deployment/                  # 部署相关
│   ├── DEPLOYMENT_GUIDE.md
│   └── ...
├── versions/                    # 版本历史
│   ├── RELEASE_v2.2.0.md
│   └── ...
└── archive/                     # 归档文档
    ├── PANELS_OPTIMIZATION_SUMMARY.md
    └── ...
```

---

## 🔴 重要规则

**根目录禁止存放**：
- ❌ 临时 .md 文件
- ❌ 测试文件
- ❌ 临时脚本

**详细规则**: [DIRECTORY_MANAGEMENT.md](./DIRECTORY_MANAGEMENT.md)

---

## 📚 文档分类

### 📊 Reports (`reports/`)
项目报告和总结文档：
- 完成报告
- 优化报告
- 对比报告
- 项目总结

### 📖 Guides (`guides/`)
使用指南和教程：
- 快速开始
- 设置指南
- 测试指南
- 功能使用

### ✨ Features (`features/`)
功能设计和实现文档：
- 功能增强
- UI/UX 优化
- 交互改进
- 主题设计

### 🚀 Deployment (`deployment/`)
部署相关文档：
- 部署指南
- 发布流程
- CI/CD 配置
- 包发布

### 🏷️ Versions (`versions/`)
版本历史文档：
- 版本说明
- 发布日志
- Hotfix 记录

### 📦 Archive (`archive/`)
历史功能文档（已完成或废弃）

---

## 🔍 快速查找

### 我想了解...

**如何开始项目？**
→ [guides/QUICK_START_GUIDE.md](./guides/QUICK_START_GUIDE.md)

**如何部署？**
→ [deployment/DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md)

**最新的优化？**
→ [reports/COMPLETE_OPTIMIZATION_REPORT.md](./reports/COMPLETE_OPTIMIZATION_REPORT.md)

**功能设计思路？**
→ [features/DESIGN.md](./features/DESIGN.md)

**版本历史？**
→ [versions/](./versions/)

---

## 🛠️ 维护指南

### 添加新文档

1. **选择正确的目录**
   - 报告总结 → `reports/`
   - 使用指南 → `guides/`
   - 功能设计 → `features/`
   - 部署相关 → `deployment/`
   - 版本发布 → `versions/`

2. **命名规范**
   - 使用清晰的文件名
   - 大写单词
   - 使用下划线或连字符
   - 例如：`FEATURE_NAME-GUIDE.md`

3. **更新索引**
   - 在本 README 中添加链接
   - 在相关文档中引用新文档

### 归档旧文档

当文档内容过时或功能已废弃时：

1. 移动到 `docs/archive/`
2. 添加日期前缀：`YYYY-MM-DD-文件名.md`
3. 在原位置添加重定向说明

### 删除文档

⚠️ **删除前确认**：
- 文档确实不再需要
- 没有其他文档引用它
- 内容已迁移到新位置

---

## 📝 文档模板

### 报告类模板

```markdown
# 报告标题

**日期**: YYYY-MM-DD
**作者**: 作者名
**类型**: 完成报告/优化报告/总结报告

## 背景
...

## 完成内容
...

## 结果
...

## 下一步
...
```

### 指南类模板

```markdown
# 功能名称指南

**版本**: X.Y.Z
**最后更新**: YYYY-MM-DD

## 概述
...

## 前置条件
...

## 步骤
1. ...
2. ...

## 常见问题
...
```

---

## 🔗 相关资源

- **项目根文档**: [CLAUDE.md](../CLAUDE.md)
- **项目说明**: [README.md](../README.md)
- **目录规则**: [DIRECTORY_MANAGEMENT.md](./DIRECTORY_MANAGEMENT.md)

---

## ✅ 检查清单

在添加新文档前，确保：

- [ ] 放在正确的目录中
- [ ] 文件名符合规范
- [ ] 包含创建日期
- [ ] 格式统一（Markdown）
- [ ] 更新了本 README 的索引
- [ ] 运行了 `bash scripts/check-root-dir.sh`

---

**保持文档整洁，让项目更专业！** 🤙
