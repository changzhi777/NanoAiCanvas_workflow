[根目录](../../CLAUDE.md) > [src](../) > **hooks**

---

# Hooks 模块 - 自定义 React Hooks

> 18 个可复用自定义 Hooks + 8 个测试文件，覆盖保存、通信、输入、性能、UI 适配等场景

**最后更新**: 2026-08-11
**维护者**: NanoAiCanvas Team

---

## 模块职责

Hooks 模块封装可复用的 React 逻辑，按功能分为 5 组：

| 分组 | Hook 数量 | 测试覆盖 | 职责 |
|------|-----------|---------|------|
| **数据持久化** | 2 | 1/2 | 自动保存、画布历史 |
| **实时通信** | 3 | 0/3 | Chat WebSocket、通知 WebSocket、MQTT |
| **输入交互** | 4 | 3/4 | 快捷键、快捷键系统、IME 中文输入、Toast |
| **UI 适配** | 4 | 4/4 | 响应式布局、窗口自适应、缩放自适应、性能模式 |
| **业务逻辑** | 5 | 0/5 | 国际化、积分、主题样式、清理、虚拟化节点 |

---

## Hook 全览

### 数据持久化

| Hook | 文件 | 测试 | 描述 |
|------|------|------|------|
| `useAutosave` | `useAutosave.ts` | - | 定时自动保存画布数据到 localStorage |
| `useCanvasHistory` | `useCanvasHistory.ts` | `useCanvasHistory.test.ts` | 画布操作历史，支持撤销/重做 |

### 实时通信

| Hook | 文件 | 测试 | 描述 |
|------|------|------|------|
| `useChatSocket` | `useChatSocket.ts` | - | Chat WebSocket 连接管理，消息收发 |
| `useNotificationSocket` | `useNotificationSocket.ts` | - | 通知 WebSocket，实时推送通知 |
| `useMqttClient` | `useMqttClient.ts` | - | MQTT 客户端，物联网/设备通信 |

### 输入交互

| Hook | 文件 | 测试 | 描述 |
|------|------|------|------|
| `useShortcuts` | `useShortcuts.ts` | - | 全局快捷键绑定（保存/撤销/删除/复制/缩放等） |
| `useShortcutSystem` | `useShortcutSystem.ts` | - | 快捷键系统化管理，支持动态注册/注销 |
| `useIMETextarea` | `useIMETextarea.ts` | `useIMETextarea.test.ts` | IME 中文输入兼容处理，解决组合键冲突 |
| `useToast` | `useToast.ts` | `useToast.test.ts` | Toast 通知触发器 |

### UI 适配

| Hook | 文件 | 测试 | 描述 |
|------|------|------|------|
| `useResponsive` | `useResponsive.ts` | - | 响应式断点检测（sm/md/lg/xl） |
| `useWindowSizeAdaptive` | `useWindowSizeAdaptive.ts` | `useWindowSizeAdaptive.test.ts` | 窗口尺寸自适应布局计算 |
| `useZoomAdaptive` | `useZoomAdaptive.ts` | `useZoomAdaptive.test.ts` | 画布缩放级别自适应 |
| `usePerformanceMode` | `usePerformanceMode.ts` | `usePerformanceMode.test.ts` | 性能模式检测与切换（低端设备降级） |

### 业务逻辑

| Hook | 文件 | 测试 | 描述 |
|------|------|------|------|
| `useI18n` | `useI18n.ts` | - | 国际化 Hook，封装 react-i18next |
| `usePoints` | `usePoints.ts` | - | 积分查询与余额管理 |
| `useThemeStyles` | `useThemeStyles.ts` | `useThemeStyles.test.ts` | 主题样式计算（OKLCH 颜色空间） |
| `useCleanup` | `useCleanup.ts` | `useCleanup.test.ts` | 组件卸载时清理资源（定时器/订阅/WebSocket） |
| `useVirtualizedNodes` | `useVirtualizedNodes.ts` | - | 虚拟化节点渲染，大量节点性能优化 |

---

## 关键 Hook 详解

### useAutosave

定时保存画布状态，支持配置保存间隔。

```typescript
function useAutosave(): void
```

- 依赖 Redux Store: `selectAutosave`（开关）、`selectAutosaveInterval`（间隔 ms）
- 防抖处理，避免高频保存

### useIMETextarea

解决中文输入法（IME）组合过程中触发快捷键的问题。

```typescript
function useIMETextarea(): {
  isComposing: boolean
  imeProps: { onCompositionStart: () => void; onCompositionEnd: () => void }
}
```

- 在 `compositionstart` → `compositionend` 期间屏蔽全局快捷键
- 配合 `useShortcuts` 使用，防止误触发

### useChatSocket

Chat WebSocket 生命周期管理。

```typescript
function useChatSocket(conversationId: string): {
  messages: Message[]
  send: (content: string) => void
  isConnected: boolean
}
```

### useNotificationSocket

通知系统 WebSocket 连接。

```typescript
function useNotificationSocket(): {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
}
```

### useMqttClient

MQTT 协议客户端 Hook。

```typescript
function useMqttClient(options: MqttOptions): {
  publish: (topic: string, message: string) => void
  subscribe: (topic: string) => void
  messages: MqttMessage[]
}
```

### usePoints

积分查询与余额管理。

```typescript
function usePoints(): {
  balance: number
  loading: boolean
  refresh: () => Promise<void>
}
```

### usePerformanceMode

根据设备性能自动检测并切换渲染模式。

```typescript
function usePerformanceMode(): {
  isLowPerformance: boolean
  mode: 'high' | 'medium' | 'low'
}
```

---

## 快捷键系统

### useShortcuts 支持的快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + S` | 保存 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl/Cmd + Y` | 重做 |
| `Delete/Backspace` | 删除选中 |
| `Ctrl/Cmd + D` | 复制 |
| `Ctrl/Cmd + +` | 放大 |
| `Ctrl/Cmd + -` | 缩小 |
| `Ctrl/Cmd + 0` | 适应屏幕 |
| `F1` | 切换属性面板 |
| `F2` | 切换模板面板 |

---

## 测试与质量

### 测试文件清单（8 个）

| 测试文件 | 覆盖 Hook |
|---------|----------|
| `useCanvasHistory.test.ts` | useCanvasHistory |
| `useIMETextarea.test.ts` | useIMETextarea |
| `useToast.test.ts` | useToast |
| `useWindowSizeAdaptive.test.ts` | useWindowSizeAdaptive |
| `useZoomAdaptive.test.ts` | useZoomAdaptive |
| `usePerformanceMode.test.ts` | usePerformanceMode |
| `useThemeStyles.test.ts` | useThemeStyles |
| `useCleanup.test.ts` | useCleanup |

**覆盖率**：8/18 = 44%（UI 适配组 100%、输入交互组 75%、数据持久化组 50%、实时通信/业务逻辑组 0%）

### 测试基础设施

依赖 `src/test/setup.ts` 提供的全局 mock：
- `localStorage`（functional mock，实际存储值）
- `fetch`、`Response`
- `EventSource`（SSE 模拟，含 `emit/simulateOpen/simulateError` 测试辅助方法）
- `IntersectionObserver`、`ResizeObserver`
- `window.matchMedia`

### 运行测试

```bash
pnpm test src/hooks/                 # 仅 Hooks 测试
pnpm test:coverage                   # 覆盖率报告
```

---

## 关键依赖

| 依赖 | 用途 |
|------|------|
| `react-redux` | Redux Store 集成 |
| `react-i18next` | 国际化 |
| `sonner` | Toast 通知 |
| `reactflow` | 画布缩放/视口 |

---

## 相关文件清单

```
src/hooks/                            # 18 Hooks + 8 测试
├── useAutosave.ts                    # 自动保存
├── useCanvasHistory.ts + .test.ts    # 画布历史 + 测试
├── useChatSocket.ts                  # Chat WebSocket
├── useCleanup.ts + .test.ts          # 资源清理 + 测试
├── useI18n.ts                        # 国际化
├── useIMETextarea.ts + .test.ts      # IME 中文输入 + 测试
├── useMqttClient.ts                  # MQTT 客户端
├── useNotificationSocket.ts          # 通知 WebSocket
├── usePerformanceMode.ts + .test.ts  # 性能模式 + 测试
├── usePoints.ts                      # 积分管理
├── useResponsive.ts                  # 响应式断点
├── useShortcutSystem.ts              # 快捷键系统
├── useShortcuts.ts                   # 全局快捷键
├── useThemeStyles.ts + .test.ts      # 主题样式 + 测试
├── useToast.ts + .test.ts            # Toast 通知 + 测试
├── useVirtualizedNodes.ts            # 虚拟化节点
├── useWindowSizeAdaptive.ts + .test.ts # 窗口尺寸适配 + 测试
└── useZoomAdaptive.ts + .test.ts     # 缩放自适应 + 测试
```

---

## 变更记录 (Changelog)

### 2026-08-11
- 增量更新：新增 8 个测试文件，覆盖率 0% → 44%
- 新增"测试与质量"章节，记录测试基础设施（src/test/setup.ts）和测试清单
- UI 适配组 100% 覆盖、输入交互组 75% 覆盖

### 2026-05-15
- 全面更新：从 3 个 Hook 扩展到 18 个 Hook
- 新增实时通信组：useChatSocket、useNotificationSocket、useMqttClient
- 新增输入交互组：useIMETextarea、useShortcutSystem、useToast
- 新增 UI 适配组：useResponsive、useWindowSizeAdaptive、useZoomAdaptive、usePerformanceMode
- 新增业务逻辑组：usePoints、useThemeStyles、useCleanup、useVirtualizedNodes、useCanvasHistory
- 按功能分组重新组织文档结构

### 2026-04-15
- 初始化模块文档（useAutosave、useShortcuts、useI18n）
