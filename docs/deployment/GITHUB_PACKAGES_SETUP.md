# 📦 GitHub Packages 配置指南

> **状态**: 准备就绪，等待您创建 GitHub Token

---

## 🎯 步骤概述

1. ✅ 准备工作
2. ⏳ 创建 GitHub Personal Access Token
3. ⏳ 修改 package.json 配置
4. ⏳ 发布到 GitHub Packages

---

## 步骤1：准备工作 ✅

### 检查项目是否已推送到 GitHub

```bash
cd /Users/mac/cz_code/NanoAiCanvas
git remote -v
```

**如果还没有推送到 GitHub**:

```bash
# 1. 在 GitHub 创建新仓库
# 访问 https://github.com/new

# 2. 添加 remote（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/nanoai-canvas.git

# 3. 推送代码
git branch -M main
git push -u origin main
```

---

## 步骤2：创建 GitHub Personal Access Token ⏳

### 2.1 访问 GitHub Token 设置

**链接**: https://github.com/settings/tokens

或者：
```
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
```

### 2.2 生成新 Token

1. 点击 **Generate new token** (classic)
2. 设置 Token 名称：`nanoai-canvas-publish`
3. 选择 Scopes：
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages`
4. 点击 **Generate token**
5. **重要**: 复制 Token（只显示一次！）

**生成的 Token 格式**:
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 步骤3：修改 package.json 配置 ⏳

### 3.1 修改包名

需要在项目目录中执行：

```bash
cd /Users/mac/czode/NanoAiCanvas
```

**选项 A: 使用个人账户** (推荐个人开发者)

```json
{
  "name": "@YOUR_USERNAME/nanoai-canvas",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

**选项 B: 使用组织账户** (推荐团队)

```json
{
  "name": "@YOUR_ORG/nanoai-canvas",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 3.2 创建 .npmrc 文件

```bash
cat > .npmrc << 'EOF'
@YOUR_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
EOF
```

**注意**: 将 `YOUR_USERNAME` 替换为您的 GitHub 用户名，将 `YOUR_GITHUB_TOKEN` 替换为上一步创建的 Token。

---

## 步骤4：发布到 GitHub Packages ⏳

### 4.1 准备发布

```bash
# 1. 确保在项目目录
cd /Users/mac/cz_code/NanoAiCanvas

# 2. 更新版本（如果需要）
pnpm version patch  # 2.2.0 -> 2.2.1

# 3. 构建
pnpm run build:lib
```

### 4.2 发布

```bash
# 发布到 GitHub Packages
npm publish
```

### 4.3 验证发布

```bash
# 查看包信息
npm view @YOUR_USERNAME/nanoai-canvas
```

### 4.4 在其他项目中使用

```bash
# 安装
pnpm add @YOUR_USERNAME/nanoai-canvas

# 使用
import { CanvasPage } from '@YOUR_USERNAME/nanoai-canvas'
import '@YOUR_USERNAME/nanoai-canvas/styles'
```

---

## 🔐 安全提示

### Token 管理

1. **不要提交 Token 到仓库**
   ```bash
   # 确保 .npmrc 在 .gitignore 中
   echo ".npmrc" >> .gitignore
   ```

2. **使用环境变量**
   ```bash
   export GITHUB_TOKEN="ghp_xxxxxxxx"
   ```

3. **设置 Token 过期时间**
   - 建议设置 30-90 天
   - 过期后需要重新生成

4. **限制权限范围**
   - 只授予必要的权限
   - 不要授予仓库写入权限

---

## 🎯 快速命令参考

### 配置和发布

```bash
# 1. 创建 .npmrc
cat > .npmrc << EOF
@YOUR_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
EOF

# 2. 更新 package.json
# 手动编辑 name 和 publishConfig

# 3. 发布
npm publish
```

---

## ✅ 当前状态

### 已完成

- ✅ 构建系统配置完成
- ✅ 文档准备完成
- ✅ 本地 Verdaccio 发布成功

### 待您完成

- ⏳ 推送代码到 GitHub
- ⏳ 创建 Personal Access Token
- ⏳ 修改 package.json 配置
- ⏳ 执行发布命令

---

## 📋 检查清单

发布前确认：

- [ ] 代码已推送到 GitHub
- [ ] Personal Access Token 已创建
- [ ] `.npmrc` 文件已配置（不包含在 Git 中）
- [ ] `package.json` 中的 `name` 使用 `@user/name` 格式
- [ ] `publishConfig.registry` 设置为 `https://npm.pkg.github.com`
- [ ] `.npmignore` 配置正确

---

## 🎊 下一步

**准备好后执行**：

1. **创建 GitHub Token**: https://github.com/settings/tokens
2. **修改 package.json**: 更新 name 和 publishConfig
3. **配置 .npmrc**: 设置认证
4. **执行发布**: `npm publish`

需要我帮您执行 package.json 的修改吗？请提供您的 GitHub 用户名。

---

**📚 相关文档**:
- [Verdaccio 指南](./VERDACCIO_SETUP.md)
- [使用示例](./EXAMPLES.md)
- [完整文档](./LIBRARY_README.md)
