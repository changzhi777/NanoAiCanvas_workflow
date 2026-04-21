# 编译错误修复清单

> **生成时间**: 2026-04-21  
> **状态**: 📝 待修复

---

## 🔧 需要修复的编译错误

### 1. WorkflowEdge类型不匹配 (高优先级)

**错误位置**: `NanoaiWorkflowCanvas.tsx:46-51`

**问题**: WorkflowEdge类型与ReactFlow的Edge类型不兼容

**解决方案**:
```tsx
// 方案1: 修改useEdgesState的类型声明
const [edges, setEdges, onEdgesChange] = useEdgesState<any>(storeEdges);

// 方案2: 修改store中的WorkflowEdge类型，使其兼容Edge
interface WorkflowEdge extends Edge {
  // 自定义属性
}
```

### 2. 未使用的React导入 (中优先级)

**错误位置**: 
- `CharacterDesignerNode.tsx:1`
- `DialogueGeneratorNode.tsx:1`
- `SceneDesignerNode.tsx:1`
- `ScriptGeneratorNode.tsx:1`
- `StoryboardGeneratorNode.tsx:1`
- `Theme.tsx:1`
- `NanoaiWorkflowPage.tsx:1`

**解决方案**: 移除未使用的React导入
```tsx
// 修改前
import React, { useCallback, useState } from 'react';

// 修改后
import { useCallback, useState } from 'react';
```

### 3. 未使用的NodeProps导入 (低优先级)

**错误位置**: `BaseNode.tsx:2`

**解决方案**: 移除未使用的导入
```tsx
// 修改前
import { NodeProps } from 'reactflow';

// 修改后 - 完全移除，因为BaseNodeProps不再继承NodeProps
```

### 4. aspectRatio类型错误 (中优先级)

**错误位置**: `StoryboardGeneratorNode.tsx:69`

**问题**: 字符串不能赋值给aspectRatio类型

**解决方案**:
```tsx
// 修改前
aspectRatio: "16:9" as any

// 修改后
aspectRatio: "16:9" as "16:9" | "16:9" | undefined
// 或者
aspectRatio: "16:9" as any
```

### 5. UIComponents类型错误 (低优先级)

**错误位置**: `UIComponents.tsx:141, 232`

**问题**: 
- 索引访问类型不匹配
- Element不能赋值给string

**解决方案**:
```tsx
// 141行 - 添加类型断言
const config = toastConfig[type as keyof typeof toastConfig];

// 232行 - 修复Element类型
<div className={String(toastConfig[type].icon)}>
```

### 6. NodeJS类型未定义 (低优先级)

**错误位置**: `UIComponents.tsx:17`

**解决方案**: 添加类型导入
```tsx
/// <reference types="node" />
// 或者
import type { NodeJS } from '@types/node';
```

### 7. Connection未使用 (低优先级)

**错误位置**: `nanoaiWorkflowStore.ts:3`

**解决方案**: 移除未使用的导入

### 8. Interface扩展问题 (中优先级)

**错误位置**: `nanoaiWorkflowStore.ts:58`

**问题**: Interface只能扩展对象类型

**解决方案**: 使用type代替interface或修改扩展方式

---

## ✅ 快速修复命令

```bash
# 1. 移除所有未使用的React导入
find src/components/nanoai-workflow -name "*.tsx" -exec sed -i '' '/^import React from/d' {} \;

# 2. 重新构建
npm run build
```

---

## 🎯 推荐修复顺序

1. **高优先级**: 修复WorkflowEdge类型问题
2. **中优先级**: 修复aspectRatio和interface扩展问题
3. **低优先级**: 清理未使用的导入

---

## 📝 注意事项

- 这些是TypeScript编译错误，不影响运行时
- 可以使用`// @ts-ignore`临时绕过
- 或者修改`tsconfig.json`放宽类型检查

---

**生成时间**: 2026-04-21  
**维护者**: BB小子 🤙
