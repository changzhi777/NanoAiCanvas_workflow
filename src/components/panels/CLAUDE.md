[根目录](../../CLAUDE.md) > [src](../) > [components](../) > **panels**

---

# Panels 模块 - 侧边面板组件

> 属性面板和节点模板面板

**最后更新**: 2026-04-15
**维护者**: NanoAiCanvas Team

---

## 模块职责

Panels 模块负责：

- 显示和编辑节点属性
- 提供节点模板快速创建
- 管理面板显示状态

---

## 入口与启动

### PropertiesPanel

**文件**: `PropertiesPanel.tsx`

```typescript
export default function PropertiesPanel() {
  // 显示选中节点的属性
}
```

### NodeTemplatesPanel

**文件**: `NodeTemplatesPanel.tsx`

```typescript
export default function NodeTemplatesPanel() {
  // 显示节点模板列表
}
```

---

## 对外接口

### PropertiesPanel

**功能**:
- 显示选中节点的详细信息
- 允许编辑节点属性
- 支持删除节点

**State**:
- 通过 Redux Store 获取选中节点
- 通过 Redux Actions 更新节点

### NodeTemplatesPanel

**功能**:
- 显示 7 种预定义节点模板
- 点击模板创建新节点
- 支持自定义节点类型

**节点模板**:
- 任务（Task）
- 事件（Event）
- 里程碑（Milestone）
- 决策（Decision）
- 数据（Data）
- 开始（Start）
- 结束（End）

---

## 关键依赖与配置

### 依赖项

- `react-redux`: Redux 集成
- `reactflow`: React Flow 集成
- `@/components/ui/card`: Card 组件
- `@/components/ui/button`: Button 组件
- `@/components/ui/badge`: Badge 组件

---

## 数据模型

### 节点模板

```typescript
interface NodeTemplate {
  type: NodeType
  icon: string
  label: string
  description: string
  color: string
}
```

---

## 测试与质量

### 单元测试

**状态**: 未实现

**建议测试覆盖**:
- [ ] 属性编辑
- [ ] 模板创建
- [ ] 面板切换

---

## 常见问题 (FAQ)

### Q: 如何添加新的节点模板？

A: 在 `NodeTemplatesPanel.tsx` 的 `nodeTemplates` 数组中添加新模板。

### Q: 如何自定义属性面板？

A: 修改 `PropertiesPanel.tsx`，添加新的表单字段。

---

## 相关文件清单

```
src/components/panels/
├── PropertiesPanel.tsx      # 属性面板
└── NodeTemplatesPanel.tsx   # 模板面板
```

---

## 变更记录 (Changelog)

### 2026-04-15
- 初始化模块文档
- 完成属性面板和模板面板
- 支持 7 种预定义节点类型
