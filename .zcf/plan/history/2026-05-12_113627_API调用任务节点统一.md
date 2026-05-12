# API调用任务节点统一计划

**创建时间**：2026-05-05 01:45:37
**最后更新**：2026-05-05 01:58:00
**状态**：✅ 主要实现完成

---

## 已完成

### 1. TaskNodeBase 基类
- 文件：`src/components/nanoai-workflow/nodes/TaskNodeBase.tsx`
- 统一状态显示（idle/running/success/error + 进度动画）
- 统一参数编辑器（基于 schema 自动生成）
- 统一执行按钮和结果预览
- 统一错误处理

### 2. 已重构节点（8个）

| 节点 | 文件 | API |
|------|------|-----|
| MiniMaxTextNode | MiniMaxTextNode.tsx | generateText |
| MiniMaxSpeechNode | MiniMaxSpeechNode.tsx | generateSpeech |
| MiniMaxVideoNode | MiniMaxVideoNode.tsx | generateVideo |
| MiniMaxMusicNode | MiniMaxMusicNode.tsx | generateMusic |
| MiniMaxImageNode | MiniMaxImageNode.tsx | generateImage |
| MiniMaxCodingNode | MiniMaxCodingNode.tsx | codingPlanSearch |
| NanoBanana2Node | NanoBanana2Node.tsx | generateNanoaiImageWithPolling |
| GPTImage2Node | GPTImage2Node.tsx | generateGPTImageWithPolling |

### 3. 统一参数结构
```typescript
interface ApiTaskParams {
  apiType: 'minimax' | 'suchuang' | 'gpt' | 'custom';
  action: 'text' | 'speech' | 'image' | 'video' | 'music' | 'coding';
  prompt?: string;
  inputText?: string;
  query?: string;
  model?: string;
  temperature?: number;
  maxLength?: number;
  maxTokens?: number;
  size?: string;
  aspectRatio?: string;
  quality?: 'standard' | 'hd';
  voice?: string;
  speed?: number;
  duration?: number;
  referenceUrls?: string[];
  timeout?: number;
  retryCount?: number;
  outputType: 'text' | 'image' | 'audio' | 'video' | 'json';
  [key: string]: any;
}
```

---

## 待优化（executeNode 重构）

当前 `executeNode` 仍使用 switch-case，需要改为 Map 表驱动。

---

## TypeScript 错误

剩余错误均为其他模块的 unused import，不影响本次任务。