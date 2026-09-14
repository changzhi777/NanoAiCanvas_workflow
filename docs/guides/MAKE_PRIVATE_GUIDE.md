# GitHub 仓库设置为私密操作指南

**日期**: 2026-04-22
**操作**: 将公开仓库设置为私密
**仓库**: https://github.com/changzhi777/NanoAiCanvas_workflow

---

## ⚠️ 重要说明

**AI 助手无法直接修改 GitHub 仓库设置**，需要您手动在 GitHub 网页上操作。

---

## 📋 操作步骤

### 方法 1: 通过 GitHub 网页界面（推荐）

#### 步骤 1: 打开仓库设置页面

1. 访问仓库主页: https://github.com/changzhi777/NanoAiCanvas_workflow

2. 点击页面右上角的 **"Settings"**（设置）标签

   ```
   位置: 仓库页面右上角
   图标: ⚙️ 齿轮图标
   ```

#### 步骤 2: 滚动到危险操作区域

1. 在设置页面，向下滚动到页面底部

2. 找到 **"Danger Zone"**（危险区域）部分

3. 在危险区域中找到 **"Change repository visibility"**（更改仓库可见性）

#### 步骤 3: 更改仓库可见性

1. 点击 **"Change visibility"** 按钮

2. 在弹出的对话框中，选择 **"Make private"**（设为私密）

3. GitHub 会要求您确认操作，会显示以下警告：
   - ⚠️ 所有协作者将失去访问权限
   - ⚠️ 所有 Fork 将被取消关联
   - ⚠️ Stars 和 Watchers 将被移除

4. 阅读警告信息后，输入仓库名称确认：
   ```
   输入: changzhi777/NanoAiCanvas_workflow
   ```

5. 点击 **"I understand, change repository visibility"** 按钮

#### 步骤 4: 等待操作完成

- GitHub 会处理您的请求
- 通常需要几秒钟到几分钟
- 完成后会自动跳转到仓库主页

#### 步骤 5: 验证仓库已设为私密

1. 查看仓库页面，应该看到 🔒 图标
2. 访问: https://github.com/changzhi777/NanoAiCanvas_workflow
3. 如果未登录，应该显示 "Repository not found" 或要求登录

---

### 方法 2: 使用 GitHub CLI（如果已安装）

```bash
# 1. 安装 GitHub CLI（如果未安装）
# macOS
brew install gh

# 2. 登录 GitHub
gh auth login

# 3. 将仓库设置为私密
gh repo edit changzhi777/NanoAiCanvas_workflow --visibility private

# 4. 验证
gh repo view changzhi777/NanoAiCanvas_workflow
```

---

## 📊 设置私密后的影响

### ✅ 变化

1. **访问控制**
   - 只有您和明确授权的用户可以访问
   - 未登录用户无法查看仓库
   - 搜索引擎无法索引

2. **协作者**
   - 现有的协作者保留访问权限
   - 需要手动添加新的协作者

3. **Forks 和 Stars**
   - ⚠️ 所有 Fork 将被取消关联
   - ⚠️ Stars 数量将重置为 0
   - ⚠️ Watchers 将被移除

4. **Issues 和 PRs**
   - ✅ 现有的 Issues 和 PRs 保留
   - ✅ 历史记录完整保留

### ❌ 不会影响

1. **Git 历史**
   - ✅ 所有提交历史保留
   - ✅ 所有分支保留
   - ✅ 所有标签保留

2. **本地仓库**
   - ✅ 本地代码不受影响
   - ✅ Git 远程地址不变
   - ✅ 可以继续正常推送

---

## 🔐 验证仓库已设为私密

### 检查方法 1: 浏览器（未登录状态）

1. 打开隐身/隐私浏览模式
2. 访问: https://github.com/changzhi777/NanoAiCanvas_workflow
3. 应该看到 "Repository not found" 或要求登录

### 检查方法 2: 使用命令行

```bash
# 使用 curl 测试（不需要认证）
curl -I https://github.com/changzhi777/NanoAiCanvas_workflow

# 如果返回 404，说明已设为私密
# HTTP/2 404
```

### 检查方法 3: GitHub CLI

```bash
gh repo view changzhi777/NanoAiCanvas_workflow

# 应该显示:
# Visibility: private
```

---

## 👥 添加协作者（可选）

如果需要给其他人访问权限：

### 步骤 1: 进入设置页面

1. 访问仓库: https://github.com/changzhi777/NanoAiCanvas_workflow
2. 点击 **"Settings"** 标签

### 步骤 2: 添加协作者

1. 在左侧菜单中，点击 **"Collaborators and teams"**
2. 点击 **"Add people"** 按钮
3. 输入用户的：
   - GitHub 用户名
   - 或邮箱地址
4. 选择权限级别：
   - **Read** - 只读
   - **Write** - 读写
   - **Admin** - 管理员
5. 点击 **"Add"** 按钮

---

## 🔄 恢复为公开仓库（如果需要）

如果将来需要改回公开：

1. 访问仓库设置页面
2. 滚动到危险区域
3. 点击 **"Change visibility"**
4. 选择 **"Make public"**
5. 确认操作

---

## 📞 需要帮助？

### GitHub 官方文档

- [更改仓库可见性](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)

### 常见问题

**Q: 设置为私密后，本地 Git 操作会受影响吗？**

A: 不会。您仍然可以正常进行推送、拉取等操作。

**Q: 设置为私密后，原来的 Fork 会怎样？**

A: 所有 Fork 将被取消关联，但 Fork 仓库本身的代码不受影响。

**Q: 可以暂时设为私密，稍后再公开吗？**

A: 可以，您可以随时在公开和私密之间切换。

**Q: 设置为私密后，部署到 Vercel 等平台会受影响吗？**

A: 如果使用 GitHub OAuth 登录，可能需要重新配置部署平台的权限。

---

## ✅ 检查清单

设置私密后，请确认：

- [ ] 仓库页面显示 🔒 图标
- [ ] 未登录状态下无法访问仓库
- [ ] 本地 Git 操作仍然正常
- [ ] 所有重要代码已备份
- [ ] 如有需要，已添加协作者

---

**操作时间**: 2026-04-22
**维护者**: BB小子 🤙

**请按照上述步骤在 GitHub 网页上完成操作！**
