# 版本管理规则

> NanoAiCanvas Workflow 项目的版本号管理和发布规范

**版本**: 1.0.0
**生效日期**: 2026-04-22
**当前版本**: 0.1.1

---

## 📋 版本号规则

### 语义化版本（Semantic Versioning）

本项目采用简化的语义化版本号格式：**V0.1.1**

```
V主版本号.次版本号.修订号
```

### 版本号结构

| 位置 | 名称 | 范围 | 说明 |
|------|------|------|------|
| **主版本号** | Major | 0-∞ | 重大架构变更、不兼容的 API 修改 |
| **次版本号** | Minor | 0-∞ | 新功能添加、向后兼容的功能增强 |
| **修订号** | Patch | 0-∞ | Bug 修复、小改进、文档更新 |

---

## 🔄 版本更新规则

### 修订号（第 3 位）+1

**触发条件**（每次推送时自动更新）：
- ✅ Bug 修复
- ✅ 代码小改进
- ✅ 文档更新
- ✅ 性能优化
- ✅ 代码重构（不影响功能）
- ✅ 依赖更新（补丁版本）

**示例**：
```
0.1.1 → 0.1.2 → 0.1.3 → 0.1.4
```

### 次版本号（第 2 位）+1

**触发条件**（需要人工决策）：
- ✅ 添加新功能
- ✅ 添加新的节点类型
- ✅ 添加新的工作流模板
- ✅ 重大 UI/UX 改进
- ✅ 向后兼容的 API 变更
- ✅ 依赖更新（次要版本）

**示例**：
```
0.1.9 → 0.2.0 → 0.2.1 → 0.2.2
```

**注意**：次版本号更新时，修订号重置为 0

### 主版本号（第 1 位）+1

**触发条件**（需要团队讨论）：
- ✅ 重大架构变更
- ✅ 不兼容的 API 修改
- ✅ 数据库结构变更
- ✅ 核心功能重构
- ✅ 依赖版本重大升级

**示例**：
```
0.9.9 → 1.0.0 → 1.0.1 → 1.1.0
```

**注意**：主版本号更新时，次版本号和修订号都重置为 0

---

## 🚀 发布流程

### 自动发布（修订号）

**每次推送自动更新修订号**：

1. **开发完成**
   ```bash
   # 完成功能或修复 bug
   git add .
   git commit -m "fix: 修复节点连线问题"
   ```

2. **更新版本号**
   ```bash
   # 手动更新版本号（从 0.1.1 到 0.1.2）
   npm version patch

   # 或手动编辑 package.json
   # "version": "0.1.1" → "version": "0.1.2"
   ```

3. **推送到远程**
   ```bash
   git push origin main
   ```

4. **自动创建 Git Tag**
   ```bash
   # Git tag 自动创建
   git tag v0.1.2
   git push origin v0.1.2
   ```

### 手动发布（次版本号/主版本号）

**需要人工决策和执行**：

1. **创建发布分支**
   ```bash
   git checkout -b release/v0.2.0
   ```

2. **更新版本号**
   ```bash
   npm version minor  # 0.1.x → 0.2.0
   # 或
   npm version major # 0.x.x → 1.0.0
   ```

3. **更新 CHANGELOG**
   ```bash
   # 在 CHANGELOG.md 中记录变更
   ```

4. **合并和发布**
   ```bash
   git checkout main
   git merge release/v0.2.0
   git push origin main
   ```

---

## 📝 版本号示例

### 开发阶段（v0.x.x）

```
v0.1.1 - 初始版本
v0.1.2 - 修复 bug
v0.1.3 - 添加小功能
v0.2.0 - 添加新的节点类型
v0.2.1 - 修复 UI 问题
v0.3.0 - 添加工作流模板
...
```

### 生产阶段（v1.x.x）

```
v1.0.0 - 第一个稳定版本
v1.0.1 - 修复 bug
v1.1.0 - 添加新功能
v1.2.0 - 重大功能增强
v2.0.0 - 不兼容的架构变更
...
```

---

## 🔍 版本号检查

### 查看当前版本

```bash
# 查看 package.json
cat package.json | grep version

# 或使用 npm
npm version

# 或使用 git tag
git tag -l "v*"
```

### 版本号对比

```bash
# 比较两个版本
npm view nanoai-canvas versions
```

---

## 📋 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交类型

| 类型 | 说明 | 版本号影响 |
|------|------|----------|
| `fix:` | Bug 修复 | 修订号 +1 |
| `feat:` | 新功能 | 次版本号 +1 |
| `docs:` | 文档更新 | 修订号 +1 |
| `style:` | 代码格式 | 修订号 +1 |
| `refactor:` | 代码重构 | 修订号 +1 |
| `perf:` | 性能优化 | 修订号 +1 |
| `test:` | 测试相关 | 修订号 +1 |
| `chore:` | 构建/工具 | 修订号 +1 |
| `BREAKING CHANGE:` | 不兼容变更 | 主版本号 +1 |

### 提交示例

```bash
# 修复 bug
git commit -m "fix: 修复节点连线时状态未更新的问题"

# 添加新功能
git commit -m "feat: 添加新的脚本生成节点类型"

# 更新文档
git commit -m "docs: 更新 README.md 中的安装说明"

# 不兼容变更
git commit -m "feat: 重构状态管理 API

BREAKING CHANGE: 状态管理 API 已完全重构，需要更新使用代码"
```

---

## 🎯 当前版本策略

### v0.1.1（当前版本）

**项目阶段**: 开发中（Development）

**版本策略**:
- ✅ **快速迭代**: 每次推送更新修订号
- ✅ **频繁发布**: 不定期发布次要版本
- ✅ **不稳定**: API 可能变更
- ✅ **测试阶段**: 欢迎反馈和建议

**下一个版本**:
- **v0.1.2**: 修复当前已知问题
- **v0.2.0**: 添加新的工作流模板

---

## 📊 版本历史

查看完整版本历史：

- **[CHANGELOG.md](../CHANGELOG.md)** - 详细变更日志
- **[GitHub Releases](https://github.com/changzhi777/NanoAiCanvas_workflow/releases)** - 发布说明

---

## 🔧 工具和脚本

### 自动版本更新脚本

创建 `.github/workflows/version.yml`：

```yaml
name: Auto Version Bump

on:
  push:
    branches: [ main ]

jobs:
  bump-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Bump patch version
        run: |
          npm version patch -m "chore: bump version to %s"
          git push origin main
          git push origin --tags
```

### 版本检查脚本

```bash
#!/bin/bash
# scripts/check-version.sh

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
fi

# 检查是否需要版本更新
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
echo "Last tag: $LAST_TAG"
```

---

## 📞 联系方式

**版本管理问题**：
- **作者**: 外星动物（常智）
- **邮箱**: [14455975@qq.com](mailto:14455975@qq.com)
- **GitHub**: [@changzhi777](https://github.com/changzhi777)

---

## 📚 相关文档

- **[Semantic Versioning](https://semver.org/)** - 语义化版本规范
- **[Conventional Commits](https://www.conventionalcommits.org/)** - 提交信息规范
- **[npm version](https://docs.npmjs.com/cli/v9/commands/npm-version)** - npm 版本命令
- **[CHANGELOG.md](../CHANGELOG.md)** - 项目变更日志

---

**记住**: 版本号是项目的里程碑，每一次更新都应该有意义！🤙

**维护者**: BB小子 🤙
**最后更新**: 2026-04-22
