# Models 模块 - 数据模型层（16 个模型）

导航面包屑：[根目录](../../../CLAUDE.md) > [backend](../../) > [app](../) > **models**

**最后更新**: 2026-05-14

---

## 模型清单

### 核心业务

| 文件 | 行数 | 模型 | 说明 |
|------|------|------|------|
| user.py | 51 | User | UUID主键, email, username, is_admin, is_active |
| asset.py | 62 | Asset | 图片/视频/音频/文本，含 version 字段 |
| workflow.py | 38 | Workflow | 工作流快照，JSON nodes+edges |
| template.py | 28 | Template | 模板定义 |

### 积分系统

| 文件 | 说明 |
|------|------|
| points/__init__.py | 导出 Team, PointsAccount, PointsTransaction |

### API Key 管理

| 文件 | 行数 | 模型 | 说明 |
|------|------|------|------|
| api_key.py | 300 | Provider, Model, ModelUsageLog, APIKey, ModelRoute, ApiKeyConfig, BackendKeyMapping, ImageTask | 支持 frontend_key → multiple backend_keys 映射，ApiKeyManager 封装热加载逻辑（60s 缓存） |

### 应用管理

| 文件 | 行数 | 模型 | 说明 |
|------|------|------|------|
| app_visibility.py | 38 | AppVisibilityItem, VisibilityAuditLog | 三态：active/disabled/hidden |
| prompt_restrictions.py | 39 | PromptRestriction | 敏感内容过滤 |

### 社交通信

| 文件 | 行数 | 模型 | 说明 |
|------|------|------|------|
| conversation.py | 64 | Conversation, ConversationMember, Message | 支持私聊/群聊/与AI对话 |
| notification.py | 42 | Notification | 系统通知推送 |
| operation.py | 41 | Operation | 操作审计日志 |

### 内容组织

| 文件 | 行数 | 模型 | 说明 |
|------|------|------|------|
| category.py | 34 | Category | 自定义分类，支持层级 |
| tag.py | 17 | Tag | 标签 |
| folder.py | 18 | Folder | 文件夹 |
| generation_log.py | 31 | GenerationTaskLog + GenerationStatus 枚举 | 生成任务日志 |

## 数据库迁移

12 个 Alembic 版本，位于 `backend/alembic/versions/`
