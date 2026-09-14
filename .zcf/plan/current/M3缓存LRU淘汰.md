# 任务：ImageDescriptionCache LRU 淘汰（N+TTL 双保险）

## 上下文
- v2.13.120 缓存已上线
- 长期会无限增长，需 LRU 淘汰

## 计划
| # | 任务 |
|---|------|
| 1 | config.py 加 IMG_DESC_CACHE_MAX_ROWS=5000 / TTL_DAYS=30 |
| 2 | ImageDescriptionCache 加 cleanup_expired() |
| 3 | 概率触发（写入后 1/20）+ lifespan 启动清一次 |
| 4 | 推送+部署+验证 |

## 验收
- TTL 过期自动删
- 超 max_rows 按 LRU 删最少用
- Redis 残留同步清
