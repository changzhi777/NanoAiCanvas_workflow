# App 模块 - 页面路由系统（28 个页面文件）

导航面包屑：[根目录](../../CLAUDE.md) > **app**

**最后更新**: 2026-05-14

---

## 页面清单

### 主页面

| 路径 | 说明 |
|------|------|
| nano2/page.tsx | 主画布页面（NanoAI Workflow 入口） |
| notifications/page.tsx | 通知中心 |
| points/page.tsx | 积分页面 |

### 管理后台（/admin/）

| 路径 | 说明 |
|------|------|
| page.tsx | 管理后台首页 |
| layout.tsx | 管理后台布局（AdminSidebar + content） |
| users/page.tsx | 用户管理 |
| user-apply/page.tsx | 用户申请审核 |
| teams/page.tsx | 团队管理 |
| teams/[teamId]/page.tsx | 团队详情（积分/成员） |
| points/grant/page.tsx | 积分发放 |
| providers/page.tsx | 渠道商管理 |
| models/page.tsx | 模型管理 |
| models/routes/page.tsx | 模型路由配置 |
| models/usage/page.tsx | 模型用量统计 |
| api-keys/page.tsx | API Key 管理 |
| api-key-pool/page.tsx | Key 池管理 |
| key-mapper/page.tsx | 前后端 Key 映射 |
| apps/page.tsx | 应用管理总览 |
| apps/nano2/page.tsx | Nano2 应用配置 |
| apps/workflow/page.tsx | Workflow 应用配置 |
| notifications/records/page.tsx | 通知记录 |
| notifications/send/page.tsx | 发送通知 |
| communications/page.tsx | 通信管理 |
| statistics/page.tsx | 统计仪表盘 |
| system/page.tsx | 系统设置 |
| kevin/page.tsx | Kevin 监控 |
| mqtt/page.tsx | MQTT 配置 |
| mcp/page.tsx | MCP 工具管理 |

## 权限说明

- **管理后台**：需要 admin 角色（user.is_admin = True）
- **主页面**（nano2/notifications/points）：需要登录
