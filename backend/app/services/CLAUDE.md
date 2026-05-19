# Services — 后端业务服务层

[根目录](../../../CLAUDE.md) > [backend](../../) > [app](../) > **services**

**最后更新**: 2026-05-18

后端核心业务逻辑层，11 个服务 + Skills 子系统，总计 ~2500 行。

---

## 架构概览

```
Redis 三用途
├── List (LPUSH/BRPOP)  ← task_queue.py 任务队列
├── String + TTL        ← skills_worker.py 状态持久化
└── Pub/Sub             ← pubsub.py 实时推送
```

---

## 任务执行

| 文件 | 行数 | 职责 |
|------|------|------|
| `workflow_executor.py` | 136 | TVC 工作流执行器：异步5步线性流程，Redis存储进度+断点续传，SSE实时推送。配合 v2/tvc_engine.py（积分扣退+批量并行）、v2/tvc_providers.py（Provider工厂）、v2/tvc_polling.py（视频轮询） |
| `skills_worker.py` | 409 | Skills 后台 Worker：Redis 队列消费，5 步骤执行（validating→prompt_build→api_submit→generating→completed），WorkerManager 管理多 Worker 生命周期 |

## 任务队列

| 文件 | 行数 | 职责 |
|------|------|------|
| `task_queue.py` | 241 | Redis List 任务队列：LPUSH/BRPOP，任务持久化（Redis + PostgreSQL 双重保障），TaskQueueManager 管理多队列 |

## Key 管理

| 文件 | 行数 | 职责 |
|------|------|------|
| `api_key_service.py` | 182 | API Key CRUD + 热加载（60s 缓存），前端 key→后端 key 映射 |
| `health_checker.py` | 139 | API Key 健康检查：定时巡检 active Key 可用性 |
| `model_scanner.py` | 106 | API Key 模型检测：按 Provider 类型扫描可用模型并标记 |

## 积分

| 文件 | 行数 | 职责 |
|------|------|------|
| `points_service.py` | 96 | 积分计价引擎：自动计算模型价格，余额校验，扣费流程 |

## 通信

| 文件 | 行数 | 职责 |
|------|------|------|
| `pubsub.py` | 179 | Redis Pub/Sub 封装：TaskPublisher 实时推送任务状态 |

## 辅助

| 文件 | 行数 | 职责 |
|------|------|------|
| `image_downloader.py` | 123 | 外部图片下载到本地，解决临时 URL 过期 |
| `video_thumbnail.py` | - | 视频关键帧缩略图提取（FFmpeg） |
| `email.py` | 66 | 邮件发送（密码重置等） |

## 模型检测

| 文件 | 行数 | 职责 |
|------|------|------|
| `model_scanner.py` | 106 | API Key 模型扫描：按 Provider（速创/GLM/即梦等）分发检测逻辑，探针逐个测试模型可用性 |

---

## Skills 子系统（skills/）

动态 Skill 加载 + 图片生成，插件化架构。

```
skills/
├── __init__.py          (9行)
├── schemas.py           (87行)   Pydantic Schema：ChatMessage/SkillChatRequest/SkillTemplate/GenerateRequest/TaskStatus
├── skill_loader.py      (151行)  动态 Skill 加载器：扫描 skills/ 目录，读取 manifest.json + templates/ + prompt_builder
└── gpt_image_2/
    ├── __init__.py      (5行)    Skill 入口
    ├── manifest.json             Skill 配置
    ├── prompt_builder.py (81行)  提示词构建器
    ├── generate.py      (131行)  图片生成器（wuyinkeji API）
    └── templates/                提示词模板
```

### 执行模型

```
WorkerManager
  └── SkillsWorker[]（协程）
        ├── BRPOP 从 Redis 队列取任务
        └── 5 步骤执行
              1. validating    — 参数校验
              2. prompt_build  — 构建提示词
              3. api_submit    — 提交 API
              4. generating    — 轮询结果
              5. completed/failed — 完成/失败
```

---

**文档维护**: 随服务变更同步更新
**生成者**: BB小子 🤙
