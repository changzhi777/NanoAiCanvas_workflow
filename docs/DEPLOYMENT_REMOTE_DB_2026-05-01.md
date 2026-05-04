# 数据库远程同步系统 - 实施报告

> **日期**: 2026-05-01
> **版本**: 0.1.0
> **状态**: ✅ 已完成

---

## 概述

本次实施将 NanoAiCanvas 从纯本地存储模式改造为支持远程 PostgreSQL + Redis 的数据同步系统，具备离线缓存和自动同步能力。

---

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Browser)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  IndexedDB   │  │   Zustand    │  │     SyncEngine        │  │
│  │  本地优先    │◄►│  App State   │◄►│ 操作队列/冲突解决/同步 │  │
│  └──────────────┘  └──────────────┘  └───────────┬───────────┘  │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │ HTTP
┌──────────────────────────────────────────────────┼───────────────┐
│                         后端 (FastAPI)           │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────▼───────────┐    │
│  │    Redis    │  │  PostgreSQL  │  │   Sync Service       │    │
│  │ 缓存/队列   │◄►│    主存储    │◄►│  冲突解决/合并       │    │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 后端服务

### 服务器信息

| 项目 | 值 |
|------|-----|
| **地址** | `64.118.135.134` |
| **端口** | `8000` |
| **数据库** | PostgreSQL `nanoai` |
| **缓存** | Redis |

### API 端点

#### 认证
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/refresh` | 刷新 Token |
| GET | `/api/auth/me` | 获取当前用户 |

#### 资产
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/assets` | 创建资产 |
| GET | `/api/assets` | 列表资产（支持分页、筛选） |
| GET | `/api/assets/{id}` | 获取单个资产 |
| PATCH | `/api/assets/{id}` | 更新资产 |
| DELETE | `/api/assets/{id}` | 删除资产 |
| POST | `/api/assets/{id}/star` | 切换收藏 |

#### 工作流
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows` | 列表工作流 |
| GET | `/api/workflows/{id}` | 获取工作流 |
| PATCH | `/api/workflows/{id}` | 更新工作流 |
| DELETE | `/api/workflows/{id}` | 删除工作流 |
| POST | `/api/workflows/{id}/versions` | 保存版本 |
| GET | `/api/workflows/{id}/versions` | 列出版本 |

#### 同步
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/sync/push` | 推送本地操作到服务器 |
| POST | `/api/sync/pull` | 拉取服务器变更 |

---

## 数据库 Schema

### assets 表
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- type (VARCHAR) - IMAGE/VIDEO/AUDIO/TEXT
- name (VARCHAR)
- url (TEXT)
- thumbnail_url (TEXT)
- meta (JSONB) - 存储 prompt、model 等元数据
- category (VARCHAR) - CHARACTER/SCENE/STORYBOARD/GENERAL
- tags (TEXT[])
- workflow_snapshot (JSONB)
- is_starred (BOOLEAN)
- is_deleted (BOOLEAN)
- created_at / updated_at (TIMESTAMPTZ)
```

### workflows 表
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- name (VARCHAR)
- description (TEXT)
- data (JSONB) - {nodes: [], edges: []}
- version (INT) - 乐观锁
- is_deleted (BOOLEAN)
- created_at / updated_at / deleted_at
```

### operations 表（操作日志）
```sql
- id (UUID, PK)
- workflow_id (UUID, FK → workflows)
- user_id (UUID, FK → users)
- device_id (VARCHAR) - 设备标识
- op_type (VARCHAR) - create/update/delete
- entity_type (VARCHAR) - node/edge/workflow/asset
- entity_id (UUID)
- payload (JSONB)
- timestamp (TIMESTAMPTZ)
- synced (BOOLEAN)
```

---

## 前端模块

### 核心文件

| 文件 | 说明 |
|------|------|
| `src/lib/db/schema.ts` | IndexedDB Schema 定义 |
| `src/lib/db/AssetCache.ts` | 资产 LRU 缓存管理 |
| `src/lib/api/client.ts` | API 客户端封装 |
| `src/lib/sync/SyncEngine.ts` | 同步引擎 |
| `src/lib/sync/OfflineManager.ts` | 离线状态管理 |
| `src/lib/assets/useAssetCollector.ts` | 资产自动收集 Hook |
| `src/stores/remoteStore.ts` | Zustand Store（同步状态 + 认证） |

### UI 组件

| 组件 | 路径 | 说明 |
|------|------|------|
| `AssetLibraryPanel` | `src/components/ui/AssetLibrary/` | 资产库面板 |
| `AssetSelector` | `src/components/ui/AssetLibrary/` | 资产选择器（用于节点输入） |
| `SyncStatusIndicator` | `src/components/ui/AssetLibrary/` | 同步状态指示器 |
| `AssetPreview` | `src/components/ui/AssetLibrary/` | 资产预览弹窗 |

---

## 配置

### 环境变量 (.env)

```env
# API 配置（远程数据库后端）
VITE_API_BASE_URL=http://64.118.135.134:8000/api

# 功能开关
VITE_ENABLE_CLOUD_SYNC=true
```

---

## 待集成项

以下 UI 组件需要集成到现有页面：

1. **AssetLibraryPanel** - 资产库入口（需添加到 Toolbar 或 Sidebar）
2. **SyncStatusIndicator** - 同步状态显示（建议添加到页面 Header）
3. **AssetSelector** - 工作流节点资产输入（需修改节点组件支持）

---

## 测试命令

```bash
# 健康检查
curl http://64.118.135.134:8000/health

# 用户注册
curl -X POST http://64.118.135.134:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# 创建资产
TOKEN="your_token_here"
curl -X POST http://64.118.135.134:8000/api/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"IMAGE","name":"Test","url":"https://example.com/img.png"}'
```

---

## 后续优化建议

1. **安全**：Token 改用 httpOnly Cookie
2. **性能**：资产批量同步、WebSocket 实时通知
3. **功能**：资产版本历史、多设备同步冲突 UI
4. **监控**：Redis/PostgreSQL 连接池监控

---

**文档维护**: 本文档随项目更新同步维护