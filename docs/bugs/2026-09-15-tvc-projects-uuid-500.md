# Bug: GET /api/v2/tvc-projects/{无效 ID} 返回 500 而非 404

**严重度**: 🟡 中
**优先级**: P2（RESTful 规范违反）
**发现时间**: 2026-09-15
**发现来源**: `e2e/tvc-coverage.spec.ts` H3 用例
**环境**: https://app.nanoai.fun/nanoai（生产）

## 现象

调用 `GET /api/v2/tvc-projects/__totally-not-real__` 返回 **500 Internal Server Error**，而 RESTful 规范要求返回 **404 Not Found**。

## 复现

```bash
curl -sk -X GET https://app.nanoai.fun/nanoai/api/v2/tvc-projects/__totally-not-real__ \
  -H "Authorization: Bearer ${ZHY_TOKEN}"
# 实际：HTTP 500 Internal Server Error
# 预期：HTTP 404 Not Found
```

同样的 UUID 解析失败在以下端点也会触发：
- `/api/v2/tvc-projects/{x}/shots` — 不存在的 project
- `/api/v2/tvc-projects/{x}/link-task`
- `/api/v2/tvc-projects/{x}` (PUT/DELETE)

## 影响

- RESTful API 规范性受影响
- 500 错误会触发 Sentry / 监控告警（噪声）
- 客户端错误处理逻辑不友好（500 通常意味着服务端异常，不应业务用）

## 根因（推测）

1. `backend/app/api/v2/tvc_projects.py:172` 的 GET handler 直接用 `project_id` 查 DB
2. 当 `project_id` 不是合法 UUID 时，asyncpg / SQLAlchemy 抛 `InvalidUUID` 或 `DataError`
3. handler 没有 `try/except` 兜底，异常冒泡到 FastAPI 默认 500 处理

## 修复建议

```python
# backend/app/api/v2/tvc_projects.py:172

# 当前（推测）：
@router.get("/{project_id}")
async def get_project(project_id: str, ...):
    project = await db.get(TvcProject, project_id)  # 非法 UUID 直接抛
    if not project:
        raise HTTPException(404, "Project not found")
    return project

# 建议改为：
from uuid import UUID
from sqlalchemy.exc import DataError, StatementError

@router.get("/{project_id}")
async def get_project(project_id: str, ...):
    # 先校验 UUID 格式
    try:
        pid = UUID(project_id)
    except ValueError:
        raise HTTPException(404, "Project not found")  # 非法 UUID 当 404
    # 再查 DB，捕获 asyncpg 异常
    try:
        project = await db.get(TvcProject, pid)
    except (DataError, StatementError):
        raise HTTPException(404, "Project not found")
    if not project:
        raise HTTPException(404, "Project not found")
    return project
```

或更优雅：用 FastAPI 的 `Path(..., regex=UUID_REGEX)` 提前拦截

## 验证

修复后跑 `e2e/tvc-coverage.spec.ts H3`，期望 404（容差数组移除 500）。

## 关联

- 测试: `e2e/tvc-coverage.spec.ts` H3（已加 500 进容差 + console 警告）
- 报告: `e2e/reports/tvc-coverage-2026-09-15.md`
- 类似端点: `tvc_engine.py` 的 `/{task_id}` 也需同样修复
- PLAN: `.zcf/plan/current/tvc-e2e-coverage.md`
