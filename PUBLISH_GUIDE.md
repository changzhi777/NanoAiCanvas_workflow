# 📦 NanoAiCanvas 发布指南

> 如何将 NanoAiCanvas 发布为 npm 包

---

## 🎯 发布前准备

### 1. 检查 package.json

确保以下字段正确：

```json
{
  "name": "nanoai-canvas",           // 包名（全局唯一）
  "version": "2.2.0",                 // 版本号（遵循 semver）
  "private": false,                   // 必须是 false
  "main": "./dist/nanoai-canvas.cjs", // CommonJS 入口
  "module": "./dist/nanoai-canvas.js", // ESM 入口
  "types": "./dist/index.d.ts",       // TypeScript 类型定义
  "license": "MIT",                   // 开源许可证
  "files": ["dist", "README.md"]      // 发布的文件
}
```

---

## 🔨 构建库

### 本地构建测试

```bash
# 构建库
pnpm run build:lib

# 检查输出
ls -la dist/
```

**预期输出**：
```
dist/
├── nanoai-canvas.js       # ESM 格式
├── nanoai-canvas.cjs      # CommonJS 格式
├── index.d.ts             # TypeScript 类型定义
├── styles.css             # 样式文件
└── assets/                # 静态资源
```

---

## 📝 注册 npm 账号

### 1. npm 官网注册

访问 [npmjs.com](https://www.npmjs.com/) 注册账号

### 2. 本地登录

```bash
npm login
# 输入用户名
# 输入密码
# 输入邮箱验证码
```

### 3. 验证登录

```bash
npm whoami
# 应该显示你的用户名
```

---

## 🚀 发布流程

### 方式1：发布到公共 npm registry

```bash
# 1. 更新版本号
pnpm version patch  # 2.2.0 -> 2.2.1（补丁版本）
pnpm version minor  # 2.2.0 -> 2.3.0（次要版本）
pnpm version major  # 2.2.0 -> 3.0.0（主要版本）

# 2. 构建库
pnpm run build:lib

# 3. 发布（公开包）
npm publish

# 4. 验证
npm view nanoai-canvas
```

### 方式2：发布到私有 registry（推荐企业）

#### 使用 Verdaccio（本地私有 registry）

```bash
# 1. 安装 Verdaccio
npm install -g verdaccio

# 2. 启动 Verdaccio
verdaccio

# 3. 配置 .npmrc
echo "registry=http://localhost:4873" > .npmrc

# 4. 登录
npm login --registry=http://localhost:4873

# 5. 发布
npm publish --registry=http://localhost:4873
```

#### 使用 GitHub Packages

```bash
# 1. 创建 .npmrc
echo "@your-org:registry=https://npm.pkg.github.com" > .npmrc
echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc

# 2. 发布
npm publish
```

#### 使用 Verdaccio Docker（企业推荐）

```bash
# 1. 启动 Verdaccio 容器
docker run -it --rm --name verdaccio -p 4873:4873 verdaccio/verdaccio

# 2. 配置
npm set registry http://localhost:4873

# 3. 添加用户
npm adduser --registry http://localhost:4873

# 4. 发布
npm publish --registry http://localhost:4873
```

#### 使用 npm Enterprise（官方企业方案）

```bash
# 1. 配置企业 registry
npm login --registry=https://enterprise.yourcompany.com

# 2. 发布
npm publish --registry=https://enterprise.yourcompany.com
```

#### 使用 JFrog Artifactory（企业级仓库管理）

```bash
# 1. 配置 .npmrc
echo "registry=https://yourcompany.jfrog.io/artifactory/api/npm/npm-virtual/" > .npmrc

# 2. 认证
npm login --registry=https://yourcompany.jfrog.io/artifactory/api/npm/npm-virtual/

# 3. 发布
npm publish
```

#### 使用 Nexus Repository Manager

```bash
# 1. 配置
npm set registry https://nexus.yourcompany.com/repository/npm-internal/

# 2. 认证
npm login

# 3. 发布
npm publish
```

---

## 🧪 测试已发布的包

### 在新项目中测试

```bash
# 1. 创建新项目
mkdir test-nanoai-canvas
cd test-nanoai-canvas
pnpm init

# 2. 安装依赖
pnpm add react react-dom reactflow
pnpm add nanoai-canvas

# 3. 创建测试文件
cat > src/App.tsx << 'EOF'
import { CanvasPage } from 'nanoai-canvas'
import 'nanoai-canvas/styles'

export default function App() {
  return <CanvasPage />
}
EOF

# 4. 运行
pnpm dev
```

### 本地链接测试（开发中）

```bash
# 在库项目中
cd /path/to/NanoAiCanvas
pnpm link --global

# 在测试项目中
cd /path/to/test-project
pnpm link nanoai-canvas --global
```

---

## 📋 版本管理

### Semantic Versioning (semver)

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)

2.2.0 -> 2.2.1 (patch: 修复bug)
2.2.0 -> 2.3.0 (minor: 新功能，向后兼容)
2.2.0 -> 3.0.0 (major: 破坏性变更)
```

### 使用 pnpm version

```bash
# 补丁版本（bug修复）
pnpm version patch

# 次要版本（新功能）
pnpm version minor

# 主要版本（破坏性变更）
pnpm version major

# 预发布版本
pnpm version premajor --preid alpha
pnpm version preminor --preid beta
pnpm version prepatch --preid rc
```

---

## 🔄 持续集成 (CI/CD)

### GitHub Actions 自动发布

创建 `.github/workflows/publish.yml`：

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

---

## 📊 发布后验证

### 1. 检查包信息

```bash
npm view nanoai-canvas
```

### 2. 查看已发布版本

```bash
npm view nanoai-canvas versions --json
```

### 3. 下载测试

```bash
# 全局安装测试
npm install -g nanoai-canvas

# 或在项目中测试
mkdir test && cd test
npm init -y
npm install nanoai-canvas
```

---

## 🔒 权限和配置

### 设置包权限

```bash
# 查看当前包权限
npm access ls packages nanoai-canvas

# 添加协作者
npm access edit nanoai-canvas

# 设置为公开（npm私有包）
npm access public nanoai-canvas
```

### 配置 .npmrc

创建项目级 `.npmrc`：

```ini
# registry 配置
registry=https://registry.npmjs.org/

# 发布配置
//registry.npmjs.org/:_authToken=${NPM_TOKEN}

# 或使用企业 registry
registry=http://npm.yourcompany.com/
```

---

## 🐛 常见问题

### 1. 包名已存在

**错误**: `403 Forbidden - You cannot publish over the existing package`

**解决**: 更改包名或联系原包维护者

### 2. 版本冲突

**错误**: `403 Forbidden - Cannot publish over existing version`

**解决**: 更新版本号 `pnpm version patch`

### 3. 权限不足

**错误**: `401 Unauthorized - You must be logged in to publish packages`

**解决**: 重新登录 `npm login`

### 4. 构建失败

**错误**: TypeScript 或构建错误

**解决**:
```bash
# 本地测试构建
pnpm run build:lib

# 检查 dist 目录
ls -la dist/
```

### 5. 缺少类型定义

**错误**: 导入包时没有类型提示

**解决**: 确保 `package.json` 中有 `"types": "./dist/index.d.ts"`

---

## 📚 相关资源

- [npm 发布文档](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Verdaccio 文档](https://verdaccio.org/)
- [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)

---

## 🎯 快速检查清单

发布前检查：

- [ ] `package.json` 中 `private` 设置为 `false`
- [ ] 版本号已更新
- [ ] `pnpm run build:lib` 构建成功
- [ ] `dist/` 目录包含所有必需文件
- [ ] `README.md` 文档完整
- [ ] 已登录 npm
- [ ] 测试了本地构建
- [ ] 更新了 CHANGELOG.md

---

**🎊 准备好发布了吗？执行 `pnpm run build:lib && npm publish` 开始吧！**
