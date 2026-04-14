# 版本管理指南

本文档说明 NanoAiCanvas 项目的版本管理规则和流程。

---

## 📋 版本号规则

本项目采用 **语义化版本 2.0.0** (Semantic Versioning)

版本号格式：`V主版本号.次版本号.修订号`

示例：`V2.0.1`

- **主版本号 (MAJOR)**：不兼容的 API 修改
- **次版本号 (MINOR)**：向下兼容的功能性新增
- **修订号 (PATCH)**：向下兼容的问题修正

**重要规则**：每次 git 推送更新，**第三位数字（修订号）+1**

---

## 🔄 版本管理流程

### 自动更新版本号

使用提供的版本管理脚本：

```bash
# 1. 更新修订号（默认）
./scripts/version.sh patch

# 2. 更新次版本号（功能新增）
./scripts/version.sh minor

# 3. 更新主版本号（重大更新）
./scripts/version.sh major

# 4. 带更新日志
./scripts/version.sh patch "修复了样式问题"
```

脚本会自动：
- ✅ 更新 `package.json` 中的版本号
- ✅ 更新 `VERSION.md` 添加版本记录
- ✅ 创建 git commit
- ⚠️ 不会自动 push（需手动检查后推送）

### 手动更新版本号

如果需要手动更新：

1. **编辑 `package.json`**：
   ```json
   {
     "version": "2.0.2"
   }
   ```

2. **更新 `VERSION.md`**：
   ```markdown
   ## [2.0.2] - 2026-04-15
   
   ### 更新内容
   - 修复了...
   - 新增了...
   ```

3. **提交更改**：
   ```bash
   git add package.json VERSION.md
   git commit -m "chore: bump version to 2.0.2"
   ```

---

## 📝 提交信息规范

### 版本更新提交

格式：`chore: bump version to X.Y.Z`

示例：
```bash
git commit -m "chore: bump version to 2.0.2

- 更新版本号到 2.0.2
- 作者: 外星动物（常智）/ IoTchange
- 版权: Copyright (C) 2026 IoTchange - All Rights Reserved"
```

### 功能开发提交

使用约定式提交 (Conventional Commits)：

- `feat:` 新功能
- `fix:` 问题修复
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具相关

示例：
```bash
git commit -m "feat: 添加虚拟化渲染功能"
git commit -m "fix: 修复节点拖拽时的样式问题"
git commit -m "docs: 更新README文档"
```

---

## 🚀 发布流程

### 1. 开发阶段

```bash
# 创建功能分支
git checkout -b feature/amazing-feature

# 开发并提交
git add .
git commit -m "feat: 添加新功能"

# 推送到远程
git push origin feature/amazing-feature
```

### 2. 版本更新

```bash
# 切换到主分支
git checkout main

# 合并功能分支
git merge feature/amazing-feature

# 更新版本号
./scripts/version.sh patch "合并功能分支：amazing-feature"
```

### 3. 推送发布

```bash
# 推送到远程
git push origin main

# 创建版本标签（可选）
git tag v2.0.2
git push origin v2.0.2
```

---

## 📊 版本历史示例

```markdown
## [2.0.1] - 2026-04-15
### 新增
- 完整实施20项UI/UX优化功能
- 智能手势反馈系统
- 虚拟化渲染系统

## [2.0.2] - 2026-04-16
### 修复
- 修复节点拖拽时的样式问题
- 优化虚拟化渲染性能

## [2.1.0] - 2026-04-20
### 新增
- 添加WebSocket协作功能
- 实时同步光标位置

## [3.0.0] - 2026-05-01
### 重大变更
- 重构状态管理架构
- 不兼容的API更新
```

---

## ⚙️ 自动化配置

### Git Hook 自动更新版本号（可选）

可以在 `.husky/pre-commit` 中添加自动版本更新：

```bash
#!/bin/bash
# .husky/pre-commit

# 检测是否有代码变更
if git diff --cached --name-only | grep -q "src/"; then
  # 自动更新修订号
  ./scripts/version.sh patch "自动版本更新"
fi
```

**注意**：这会在每次提交时自动更新版本号，请谨慎使用。

---

## 📧 联系方式

- **作者**: 外星动物（常智）
- **组织**: IoTchange
- **邮箱**: [14455975@qq.com](mailto:14455975@qq.com)
- **版权**: Copyright (C) 2026 IoTchange - All Rights Reserved

---

## 📄 许可证

本项目为专有软件，版权所有。未经 IoTchange 明确书面许可，严禁任何形式的使用、复制、修改、分发。
