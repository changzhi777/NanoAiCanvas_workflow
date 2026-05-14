[根目录](../../../../CLAUDE.md) > [src](../../) > [components](../) > **admin**

---

# Admin 模块 - 管理后台 UI 组件

> 供管理后台 25+ 页面使用的共享 UI 组件，覆盖导航、应用配置、负载均衡监控

**最后更新**: 2026-05-14
**文件数**: 10
**消费者**: `src/app/admin/` 下所有页面

---

## 模块结构

```
src/components/admin/
├── AdminHeader.tsx          # 管理页标题栏
├── AdminSidebar.tsx         # 管理侧边栏（25+ 导航项）
├── apps/
│   ├── index.ts             # 导出
│   ├── AppConfigCard.tsx    # 应用配置卡片
│   ├── ModelSelector.tsx    # 模型选择器
│   └── shared.tsx           # 可见性管理共享组件
└── kevin/
    ├── KevinStatus.tsx      # Kevin 服务状态
    ├── LoadMonitor.tsx      # 负载监控
    ├── NodeManager.tsx      # 节点管理
    ├── PlanConfig.tsx       # 计划配置
    └── WeightSlider.tsx     # 权重滑块
```

---

## 通用组件

### AdminHeader

管理页面通用标题栏，props: `title` / `subtitle?` / `action?`。右侧可放操作按钮。

### AdminSidebar

侧边栏导航，覆盖 9 个分类、25+ 管理页面路由。使用 lucide-react 图标，`usePathname()` 高亮当前路由。

导航分类：渠道商管理、应用管理、模型与定价、消息通知、团队管理、用户管理、通讯管理、负载均衡、系统。

---

## 应用管理（apps/）

### AppConfigCard

应用配置卡片，组合启用/禁用开关 + 模型选择 + 保存操作。接收 `AppConfig` 数据和回调，图标按 app.icon 映射。

### ModelSelector

模型多选器，按应用分组（storyboard/image/voice 等），支持搜索过滤、全选/清空。选中多个模型时自动启用负载均衡。

### shared.tsx

可见性管理共享组件集，导出 7 个组件：
- **VisibilitySelector** - 三态选择器（可见可用 / 可见不可用 / 不可见）
- **StatsCards** - 统计卡片
- **FilterBar** - 搜索 + 分类/状态过滤
- **VisibilityDataTable** - 可见性数据表格，支持排序和批量选择
- **BatchActionBar** - 批量操作栏
- **AuditTimeline** - 审计日志时间线
- **VisibilityLegend** - 状态图例

类型依赖：`VisibilityState`（来自 appVisibilityStore）、`AuditLogEntry`（来自 app-visibility-api）。

---

## Kevin 监控（kevin/）

负载均衡算法（Kevin）的管理和监控组件，均调用 `@/lib/api/kevin-api`。

### KevinStatus

Kevin 算法整体状态卡片，10s 自动刷新。展示：当前策略（轮询/加权轮询/最快响应等）、模式（练习/精品）、注册节点数、Raft 状态、熔断器、健康检测。

### LoadMonitor

负载监控面板，5s 自动刷新。展示：总请求/成功/失败/成功率、平均延迟（带进度条颜色阈值：< 100ms 绿 / < 500ms 黄 / 红）、逐节点请求量/延迟/失败数。

### NodeManager

节点 CRUD 管理，15s 自动刷新。功能：4 种工作模式切换（热备/任务均分/主节点分发/竞争抢任务）、主节点选举、注册/注销节点。

### PlanConfig

计划模式切换（practice / premium），影响负载分配策略和权重配置。

### WeightSlider

请求路由权重滑块，按 provider 配置 0-100% 权重。支持全局/practice/premium 三种视图切换。

---

## 依赖关系

| 依赖 | 用途 |
|------|------|
| `@/stores/appsConfigStore` | 应用配置状态（AppConfig, AppType） |
| `@/stores/appVisibilityStore` | 可见性状态（VisibilityState） |
| `@/lib/api/admin-api` | 管理后台 API（Model 类型） |
| `@/lib/api/app-visibility-api` | 可见性 API（AuditLogEntry） |
| `@/lib/api/kevin-api` | Kevin 监控 API（Node, KevinStatus, MetricsSummary, WeightsResponse） |
| `@/components/ui/*` | shadcn/ui 基础组件（Card, Badge, Button, Switch, Slider, Select, Input） |
| `lucide-react` | 图标 |
| `@/lib/next-navigation-shim` | usePathname 兼容层 |

---

## 变更记录

### 2026-05-14
- 初始化模块文档
