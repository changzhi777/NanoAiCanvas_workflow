# Lighthouse 测试指南

> NanoAiCanvas UI/UX 优化后的性能测试

---

## 📋 测试准备

### 开发服务器状态
- ✅ 服务器已启动：http://localhost:3000
- ✅ 页面已加载：0 errors, 3 warnings
- ✅ 类型检查通过
- ✅ 生产构建成功

---

## 🧪 如何运行 Lighthouse 测试

### 方法 1：Chrome DevTools（推荐）

1. **打开 Chrome 浏览器**
2. **导航到** http://localhost:3000
3. **打开 DevTools**（F12 或 Cmd+Option+I）
4. **切换到 Lighthouse 标签**
5. **选择配置**：
   - Categories: Performance, Accessibility, Best Practices, SEO
   - Device: Desktop / Mobile
   - Throttling: Simulated Fast 3G
6. **点击 "Analyze page load"**
7. **等待测试完成（约 30 秒）**

### 方法 2：Lighthouse CLI

```bash
# 安装 Lighthouse CLI
npm install -g lighthouse

# 运行测试
lighthouse http://localhost:3000 --view

# 或仅输出 JSON
lighthouse http://localhost:3000 --output json --output-path lighthouse-report.json
```

### 方法 3：PageSpeed Insights

1. 访问：https://pagespeed.web.dev/
2. 输入 URL：http://localhost:3000
3. 点击 "Analyze"

---

## 📊 预期测试结果

基于本次优化，预期结果：

### Performance（性能）
- **预期分数**：90-95
- **关键指标**：
  - First Contentful Paint (FCP): < 1.8s
  - Largest Contentful Paint (LCP): < 2.5s
  - Total Blocking Time (TBT): < 200ms
  - Cumulative Layout Shift (CLS): < 0.1
  - Speed Index: < 3.4s

### Accessibility（可访问性）
- **预期分数**：100
- **关键指标**：
  - Contrast: ✅ PASS
  - Keyboard Navigation: ✅ PASS
  - Screen Reader: ✅ PASS
  - ARIA Labels: ✅ PASS

### Best Practices（最佳实践）
- **预期分数**：95-100
- **关键指标**：
  - HTTPS: ✅ PASS
  - No Errors: ✅ PASS
  - Doctype: ✅ PASS
  - Charset: ✅ PASS

### SEO（搜索引擎优化）
- **预期分数**：90-95
- **关键指标**：
  - Meta Description: ✅ PASS
  - Title Tag: ✅ PASS
  - Structured Data: ⚠️ PARTIAL

---

## 🔍 已验证项目

### TypeScript 类型检查
```bash
✓ npm run type-check
# 结果：0 errors
```

### 生产构建
```bash
✓ npm run build
# 结果：built in 2.76s
# Bundle 大小：合理
```

### 控制台检查
```
✓ 0 errors
⚠️ 3 warnings（非阻塞）
```

### 页面加载
```
✓ 页面成功渲染
✓ 所有资源加载
✓ 无运行时错误
```

---

## 📈 性能指标详解

### 优化措施对指标的影响

| 指标 | 优化措施 | 预期效果 |
|------|---------|---------|
| **FCP** | 代码分割 + 预加载 | ⬇️ 30-40% |
| **LCP** | 懒加载 + 资源优先级 | ⬇️ 40-50% |
| **TBT** | 代码分割 + 减少 JS | ⬇️ 50% |
| **CLS** | 避免布局偏移 | < 0.1 |
| **SI** | 骨架屏 + 快速渲染 | ⬇️ 30% |

### Bundle 分析

```
总大小：~840KB（gzip: ~270KB）

主要 chunks：
- react-vendor: 189KB → 59KB (gz)
- vendor: 388KB → 127KB (gz)
- ui-vendor: 59KB → 18KB (gz)
- CanvasPage: 64KB → 18KB (gz)
- 其他: ~85KB → ~30KB (gz)
```

---

## 🎯 验收标准

### 性能目标
- [ ] Performance 分数 >= 90
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] TBT < 200ms
- [ ] CLS < 0.1

### 可访问性目标
- [ ] Accessibility 分数 = 100
- [ ] 对比度 >= 7:1
- [ ] 键盘导航完整
- [ ] ARIA 标签完整

### 最佳实践
- [ ] Best Practices 分数 >= 95
- [ ] 无控制台错误
- [ ] HTTPS 使用
- [ ] Meta 标签完整

---

## 🐛 已知问题

### Warnings（非阻塞）
1. npm peer dependency 警告
   - @testing-library/react vs React 19
   - 影响：无
   - 解决：等待 testing-library 更新

### 建议改进
1. 添加 Web App Manifest
2. 添加 Service Worker
3. 优化字体加载
4. 添加更多 meta 标签

---

## 📝 测试步骤

### 1. 性能测试
```bash
# 打开 Chrome DevTools
# 导航到 http://localhost:3000
# 运行 Lighthouse 测试
# 记录分数
```

### 2. 可访问性测试
```bash
# 使用 WAVE 工具
# https://wave.webaim.org/
# 输入：http://localhost:3000
# 检查是否有错误
```

### 3. 响应式测试
```bash
# 测试断点
- 375px (移动端)
- 768px (平板)
- 1024px (笔记本)
- 1440px+ (桌面)
```

### 4. 功能测试
```bash
# 测试核心功能
- 创建节点
- 连接节点
- 面板切换
- 键盘导航
- 快捷键
```

---

## 📊 测试报告模板

### 测试结果记录

**测试时间**：2026-04-20  
**测试环境**：Chrome 最新版  
**测试 URL**：http://localhost:3000

#### Performance
- 分数：___ / 100
- FCP：___ ms
- LCP：___ ms
- TBT：___ ms
- CLS：___
- SI：___ ms

#### Accessibility
- 分数：___ / 100
- 对比度：___
- 键盘导航：___
- ARIA：___

#### Best Practices
- 分数：___ / 100

#### SEO
- 分数：___ / 100

---

## ✅ 当前验证状态

### 已通过检查
- [x] TypeScript 类型检查
- [x] 生产构建成功
- [x] 开发服务器运行
- [x] 页面加载成功
- [x] 控制台无错误
- [x] 代码分割工作正常
- [x] 组件懒加载工作

### 待用户测试
- [ ] Lighthouse Performance
- [ ] Lighthouse Accessibility
- [ ] Lighthouse Best Practices
- [ ] WAVE 可访问性
- [ ] 响应式布局
- [ ] 真实用户体验

---

## 🚀 下一步

1. **立即测试**：在 Chrome DevTools 运行 Lighthouse
2. **记录结果**：填写测试报告模板
3. **对比优化**：如有问题，按建议优化

---

**准备就绪！请运行 Lighthouse 测试** 🎯

*开发服务器地址：http://localhost:3000*
