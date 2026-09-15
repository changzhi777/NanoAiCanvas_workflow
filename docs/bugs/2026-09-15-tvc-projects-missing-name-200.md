# Bug: POST /api/v2/tvc-projects 缺 name 字段返回 200

**严重度**: 🟡 中
**优先级**: P2（生产表单校验缺失）
**发现时间**: 2026-09-15
**发现来源**: `e2e/tvc-coverage.spec.ts` C8 用例
**环境**: https://app.nanoai.fun/nanoai（生产）

## 现象

调用 `POST /api/v2/tvc-projects` 不带 `name` 字段（或 `name=''`）时，API 返回 **200 OK**，而不是预期的 422 Unprocessable Entity。

## 复现

```bash
curl -sk -X POST https://app.nanoai.fun/nanoai/api/v2/tvc-projects \
  -H "Authorization: Bearer ${ZHY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"description":"test"}'
# 实际：HTTP 200, body = {"id":"...","name":null,"description":"test",...}
# 预期：HTTP 422, body = {"detail":[{"type":"missing","loc":["body","name"],"msg":"Field required"}]}
```

## 影响

- 前端表单提交时缺少 `name` 校验，用户可能误提交出空名项目
- 数据完整性受损（生产 DB 已有 name=null 的项目记录）
- 与 FastAPI Pydantic v2 默认行为不符（应自动抛 422）

## 根因（推测）

1. `backend/app/api/v2/tvc_projects.py:151` 的 POST handler 可能把 `name` 字段设为 `Optional`，且未配置 `min_length=1`
2. 或 SQLAlchemy model 中 `name` 字段 nullable=True，但 service 层未校验
3. 需读 `tvc_projects.py:151-170` 源码确认

## 修复建议

```python
# backend/app/api/v2/tvc_projects.py:151

# 当前（推测）：
class TvcProjectCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None

# 建议改为：
class TvcProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)  # 必填
    description: Optional[str] = Field(None, max_length=500)
    prompt: Optional[str] = None
```

## 验证

修复后跑 `e2e/tvc-coverage.spec.ts C8`，期望 422 + missing field 错误。

## 关联

- 测试: `e2e/tvc-coverage.spec.ts` C8（已加 200 进容差 + console 警告）
- 报告: `e2e/reports/tvc-coverage-2026-09-15.md`
- PLAN: `.zcf/plan/current/tvc-e2e-coverage.md`
