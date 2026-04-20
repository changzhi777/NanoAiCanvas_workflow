# 📦 发布到 npm 或私有 registry - 完整指南

> **状态**: 准备就绪，等待执行
> **版本**: v2.2.0

---

## ✅ 前置条件检查

### 1. 构建状态

```bash
✅ pnpm run build:lib  # 构建成功
✅ dist/ 目录完整     # 文件齐全
```

### 2. package.json 配置

```json
{
  "name": "nanoai-canvas",
  "version": "2.2.0",
  "private": false,        // ✅ 已设置为 false
  "license": "MIT",         // ✅ 已设置为 MIT
  "main": "./dist/nanoai-canvas.cjs",
  "module": "./dist/nanoai-canvas.js"
}
```

---

## 🚀 方案选择

### 方案A：发布到公共 npm（开源）

**适用场景**: 开源项目，任何人都可以使用

#### 步骤：

1. **注册 npm 账号**
   ```bash
   # 访问 https://www.npmjs.com/ 注册
   ```

2. **登录**
   ```bash
   npm login
   # 输入用户名、密码、邮箱
   ```

3. **验证登录**
   ```bash
   npm whoami
   # 应该显示你的用户名
   ```

4. **检查包名是否可用**
   ```bash
   npm view nanoai-canvas
   # 如果返回 404，说明包名可用
   ```

5. **发布**
   ```bash
   cd /Users/mac/cz_code/NanoAiCanvas
   npm publish
   ```

6. **验证发布**
   ```bash
   # 查看包信息
   npm view nanoai-canvas

   # 在新项目中测试
   mkdir test && cd test
   pnpm init
   pnpm add nanoai-canvas
   ```

---

### 方案B：发布到 Verdaccio（企业私有）

**适用场景**: 企业内部使用，不开源

#### 步骤：

1. **安装 Verdaccio**
   ```bash
   npm install -g verdaccio
   ```

2. **启动 Verdaccio**
   ```bash
   verdaccio
   # 默认运行在 http://localhost:4873
   ```

3. **配置 .npmrc**
   ```bash
   echo "registry=http://localhost:4873" > .npmrc
   ```

4. **创建用户**
   ```bash
   npm adduser --registry http://localhost:4873
   # 输入用户名、密码、邮箱
   ```

5. **登录**
   ```bash
   npm login --registry http://localhost:4873
   ```

6. **发布**
   ```bash
   cd /Users/mac/cz_code/NanoAiCanvas
   npm publish --registry http://localhost:4873
   ```

7. **在其他项目中使用**
   ```bash
   # 配置 registry
   npm set registry http://localhost:4873

   # 安装
   pnpm add nanoai-canvas
   ```

---

### 方案C：发布到 GitHub Packages

**适用场景**: GitHub 托管的代码

#### 步骤：

1. **创建 GitHub Personal Access Token**
   ```
   GitHub Settings → Developer settings → Personal access tokens → Generate new token (scope: write:packages)
   ```

2. **创建 .npmrc**
   ```bash
   echo "@your-org:registry=https://npm.pkg.github.com" > .npmrc
   echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> .npmrc
   ```

3. **修改 package.json**
   ```json
   {
     "name": "@your-org/nanoai-canvas",
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

4. **发布**
   ```bash
   npm publish
   ```

5. **使用**
   ```bash
   pnpm add @your-org/nanoai-canvas
   ```

---

### 方案D：发布到 JFrog Artifactory

**适用场景**: 大型企业，需要高级功能

#### 步骤：

1. **配置 registry**
   ```bash
   npm set registry https://yourcompany.jfrog.io/artifactory/api/npm/npm-virtual/
   ```

2. **配置认证**
   ```bash
   npm login
   # 输入 Artifactory 用户名和密码
   ```

3. **发布**
   ```bash
   npm publish
   ```

---

## ⚠️ 发布前检查清单

### 必须检查

- [ ] `package.json` 中 `private` 设置为 `false`
- [ ] `package.json` 中 `license` 设置为开源许可证（如 MIT）
- [ ] 版本号已更新（`pnpm version patch/minor/major`）
- [ ] `pnpm run build:lib` 构建成功
- [ ] `dist/` 目录包含所有必需文件
- [ ] `README.md` 文档完整
- [ ] 已登录对应的 registry

### 可选检查

- [ ] 运行测试：`pnpm test`
- [ ] 代码检查：`pnpm run lint`
- [ ] 类型检查：`pnpm run type-check`
- [ ] 清理 .gitignore 中的文件：`.npmignore` 正确配置

---

## 🎯 快速发布命令

### 准备命令

```bash
# 1. 更新版本号
pnpm version patch   # 2.2.0 -> 2.2.1
pnpm version minor   # 2.2.0 -> 2.3.0
pnpm version major   # 2.2.0 -> 3.0.0

# 2. 构建
pnpm run build:lib

# 3. 检查输出
ls -la dist/
```

### 发布命令

```bash
# 公共 npm
npm publish

# Verdaccio
npm publish --registry http://localhost:4873

# GitHub Packages
npm publish

# 自定义 registry
npm publish --registry https://your-registry.com
```

---

## 📋 发布后的验证

### 验证步骤

1. **检查包信息**
   ```bash
   npm view nanoai-canvas
   ```

2. **在新项目中测试**
   ```bash
   mkdir test-install && cd test-install
   pnpm init
   pnpm add nanoai-canvas
   ```

3. **创建测试文件**
   ```tsx
   import { CanvasPage } from 'nanoai-canvas'
   import 'nanoai-canvas/styles'

   export default function App() {
     return <CanvasPage />
   }
   ```

4. **运行测试**
   ```bash
   pnpm dev
   ```

---

## 🔄 持续集成 (CI/CD)

### GitHub Actions 自动发布

创建 `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build library
        run: pnpm run build:lib

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 推送标签触发发布

```bash
# 创建并推送标签
git tag v2.2.0
git push origin v2.2.0

# GitHub Actions 将自动构建并发布
```

---

## 📊 当前状态

✅ **准备就绪**：
- 构建成功
- 配置完成
- 文档齐全

⏳ **等待执行**：
- 选择发布方案（A/B/C/D）
- 登录对应的 registry
- 执行发布命令

---

## 🎉 下一步

请选择一个发布方案，然后：

1. **公共 npm**: 执行 `npm login` 然后 `npm publish`
2. **Verdaccio**: 启动 Verdaccio 然后发布
3. **GitHub Packages**: 配置 token 然后发布
4. **JFrog**: 配置 registry 然后发布

需要我帮您执行哪个方案的具体步骤吗？
