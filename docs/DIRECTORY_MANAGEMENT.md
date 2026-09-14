# 目录管理规则

> **严格执行规则** - 本项目根目录必须保持整洁，所有文档、测试和临时文件必须存放在指定目录

**版本**: 1.0.0
**生效日期**: 2026-04-22
**执行力度**: 🔴 强制执行

---

## 核心原则

**根目录只保留必需文件**：
- ✅ `CLAUDE.md` - 项目 AI 上下文文档
- ✅ `README.md` - 项目说明文档
- ✅ `CHANGELOG.md` - 版本变更日志（标准文件）
- ✅ `package.json` - 项目配置
- ✅ 配置文件（vite.config.ts, tsconfig.json 等）
- ❌ 其他所有 .md 文件
- ❌ 测试文件
- ❌ 临时文件

---

## 文档目录结构

```
docs/
├── reports/          # 报告和总结
├── guides/           # 指南文档
├── features/         # 功能文档
├── deployment/       # 部署相关
├── versions/         # 版本历史
└── archive/          # 归档文档
```

### 目录说明

#### `docs/reports/`
存放项目报告和总结文档：
- 完成报告
- 优化报告
- 项目总结
- 对比报告

#### `docs/guides/`
存放使用指南和教程：
- 快速开始
- 设置指南
- 测试指南
- 功能指南

#### `docs/features/`
存放功能设计和实现文档：
- 功能增强
- UI/UX 优化
- 交互改进
- 主题设计

#### `docs/deployment/`
存放部署相关文档：
- 部署指南
- 发布流程
- CI/CD 配置
- 包发布

#### `docs/versions/`
存放版本历史文档：
- 版本说明
- 发布日志
- Hotfix 记录
- 变更历史

#### `docs/archive/`
存放历史功能文档（已完成或废弃）：
- 旧功能实现
- 临时修复
- 历史优化记录

---

## 禁止规则

### 🔴 根目录禁止存放

1. **临时 .md 文件**
   - ❌ `TEMP.md`
   - ❌ `TODO.md`
   - ❌ `NOTES.md`
   - ❌ `SCRATCH.md`
   - ✅ 使用 `docs/archive/` 或删除

2. **测试文件**
   - ❌ `test.ts`
   - ❌ `spec.ts`
   - ❌ `__tests__/`
   - ✅ 使用 `src/__tests__/` 或 `tests/`

3. **临时脚本**
   - ❌ `temp.js`
   - ❌ `debug.sh`
   - ❌ `scratch.py`
   - ✅ 使用 `scripts/` 或删除

4. **临时文档**
   - ❌ `DRAFT.md`
   - ❌ `WIP.md`
   - ❌ `IDEA.md`
   - ✅ 使用 `docs/features/` 或 `docs/archive/`

---

## 文件命名规范

### 报告类 (`docs/reports/`)
```
YYYY-MM-DD-报告名称.md
例如：2026-04-22-性能优化报告.md
```

### 指南类 (`docs/guides/`)
```
功能名称-GUIDE.md
例如：WORKFLOW_GUIDE.md
```

### 功能类 (`docs/features/`)
```
功能名称-ENHANCEMENT.md
功能名称-OPTIMIZATION.md
例如：ANIMATION_ENHANCEMENTS.md
```

### 部署类 (`docs/deployment/`)
```
DEPLOYMENT-GUIDE.md
PUBLISH-GUIDE.md
```

### 版本类 (`docs/versions/`)
```
RELEASE_vX.Y.Z.md
HOTFIX_vX.Y.Z.md
```

### 归档类 (`docs/archive/`)
```
保持原文件名，添加日期前缀
YYYY-MM-DD-原文件名.md
```

---

## Git 提交前检查

### Pre-commit Hook 规则

在 `.git/hooks/pre-commit` 中添加检查：

```bash
#!/bin/bash

# 检查根目录是否有禁止的文件
echo "🔍 检查根目录文件..."

# 检查临时 .md 文件
TEMP_MD=$(find . -maxdepth 1 -name "*.md" ! -name "CLAUDE.md" ! -name "README.md")
if [ -n "$TEMP_MD" ]; then
    echo "❌ 发现根目录有临时 .md 文件："
    echo "$TEMP_MD"
    echo "请将这些文件移动到 docs/ 目录"
    exit 1
fi

# 检查测试文件
TEST_FILES=$(find . -maxdepth 1 -name "*.test.*" -o -name "*.spec.*")
if [ -n "$TEST_FILES" ]; then
    echo "❌ 发现根目录有测试文件："
    echo "$TEST_FILES"
    echo "请将这些文件移动到 tests/ 或 src/__tests__/ 目录"
    exit 1
fi

echo "✅ 根目录检查通过"
```

---

## .gitignore 配置

确保 `.gitignore` 包含以下规则：

```gitignore
# 根目录临时文件
/*.md
!CLAUDE.md
!README.md

# 临时文件
/temp/
/tmp/
/scratch/
/DRAFT.md
/TODO.md
/NOTES.md

# 测试文件（根目录）
/*.test.*
/*.spec.*
```

---

## 迁移现有文件

如果你发现根目录有违规文件：

### 1. 文档文件
```bash
# 移动到合适的 docs 子目录
mv TEMP.md docs/archive/
mv IDEA.md docs/features/
```

### 2. 测试文件
```bash
# 移动到测试目录
mv test.ts src/__tests__/
mv spec.ts tests/
```

### 3. 临时脚本
```bash
# 移动到 scripts 目录或删除
mv temp.sh scripts/
rm debug.js
```

---

## 代码审查检查清单

在 PR 审查时，检查以下内容：

- [ ] 根目录只包含必需文件（CLAUDE.md, README.md, 配置文件）
- [ ] 所有文档都在 `docs/` 目录的合适子目录中
- [ ] 所有测试文件都在 `tests/` 或 `src/__tests__/` 目录
- [ ] 没有临时文件（TEMP.md, TODO.md 等）
- [ ] 文件命名符合规范
- [ ] .gitignore 规则正确配置

---

## 违规处理

### 第一次违规
- 友好提醒，指导移动文件

### 第二次违规
- 要求修改 PR，拒绝合并

### 第三次违规
- 更新文档，加强培训
- 考虑添加自动化检查

---

## 例外情况

只有在以下情况下，才能在根目录添加非标准文件：

1. **官方标准文件**
   - `LICENSE`
   - `CONTRIBUTING.md`
   - `CHANGELOG.md`

2. **构建工具必需**
   - `vite.config.ts`
   - `tsconfig.json`
   - `.eslintrc.js`

3. **经团队讨论批准**
   - 在团队会议上讨论
   - 记录在会议纪要中
   - 更新本规则文档

---

## 工具支持

### 自动检查脚本

创建 `scripts/check-root-dir.sh`：

```bash
#!/bin/bash

echo "🔍 检查根目录文件违规..."

VIOLATIONS=0

# 检查临时 .md 文件
TEMP_MD=$(ls *.md 2>/dev/null | grep -v "CLAUDE.md" | grep -v "README.md")
if [ -n "$TEMP_MD" ]; then
    echo "❌ 发现临时 .md 文件："
    echo "$TEMP_MD"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

# 检查测试文件
TEST_FILES=$(ls *.test.* *.spec.* 2>/dev/null)
if [ -n "$TEST_FILES" ]; then
    echo "❌ 发现测试文件："
    echo "$TEST_FILES"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ $VIOLATIONS -eq 0 ]; then
    echo "✅ 根目录检查通过"
    exit 0
else
    echo "❌ 发现 $VIOLATIONS 个违规项"
    exit 1
fi
```

---

## 维护

本文档由项目维护者负责更新：

- **版本**: 1.0.0
- **最后更新**: 2026-04-22
- **维护者**: BB小子 🤙
- **更新频率**: 每季度审查一次

---

**记住**：根目录整洁是项目专业性的体现！🤙
