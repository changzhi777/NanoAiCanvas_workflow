# 优化对话按钮功能

## 任务描述
优化对话按钮的功能，包括对应的用户直接的消息管理

## 方案
渐进式优化，在现有 ChatDialog.tsx 基础上逐项修复

## 步骤
1. WS路径修复 — `src/lib/api/chat-api.ts` getChatWsUrl 适配 /nanoaicanvas/ base
2. WS重连优化 — `src/hooks/useChatSocket.ts` 指数退避
3. Dialog暗色适配 — `src/components/ui/ChatDialog.tsx`
4. 删除会话API — `backend/app/api/chat.py` DELETE /chat/conversations/{id}
5. 前端删除会话 — chat-api.ts + chatStore.ts + ChatDialog.tsx
6. 消息分页加载 — ChatDialog.tsx 向上滚动加载历史
7. 会话搜索 — ChatDialog.tsx 会话列表搜索
