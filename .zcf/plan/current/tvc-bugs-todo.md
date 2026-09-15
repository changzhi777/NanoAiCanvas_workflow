# 待修复 Bug 清单（2026-09-15 TVC E2E 实测沉淀）

> 本次 TVC 100% E2E 覆盖 + 槟榔产品 15s 实跑，共发现 3 个产品 bug + 1 个链路设计缺陷。
> 全部沉淀到 `docs/bugs/`，等下次有时间一起修。

## P1（高优先级，阻断业务）

### BUG-001 — GLM-5.3-Flash 走错协议池
- **现象**: `/api/glm/optimize` + `/api/glm/tvc-script` 调 GLM-5.3-Flash 返 1310/1113
- **根因**: 后端 `glm_proxy.py:1108, 1165` 走 OpenAI 协议，但 GLM Coding Plan 把 GLM-5.3-Flash 单独放在 Anthropic 协议配额池
- **影响**: TVC step-optimize 全部硬挂，槟榔实跑三轮均 fail @ 20%
- **修复**: 新增 `_glm_anthropic_chat` helper + 按模型自动路由
- **Bug 文档**: [docs/bugs/2026-09-15-glm-anthropic-protocol.md](../../docs/bugs/2026-09-15-glm-anthropic-protocol.md)
- **测试覆盖**: `e2e/tvc-coverage.spec.ts:566-664` J 段
- **工作量**: ~2h（含单测）

### BUG-002 — step-optimize 无 fallback（链路设计缺陷）
- **现象**: step-script 失败时 GLM → MiniMax fallback OK，step-optimize 只用 GLM 硬挂
- **影响**: GLM 配额一旦耗尽，整个 TVC 任务失败
- **修复**: 仿照 step-script（glm_proxy.py:426 `_call_minimax_tvc_script`）加 fallback 路径
- **建议方案**:
  ```python
  # tvc_engine.py:588 _optimize_prompts
  # 当前：try GLM, raise
  # 修复：try GLM, except 1310/1113 → fallback to minimax M2.7
  ```
- **工作量**: ~1h

## P2（中优先级，业务可用性）

### BUG-003 — POST /tvc-projects 缺 name 返回 200
- **现象**: 不带 name 字段创建项目 → 200 而非 422
- **根因**: `tvc_projects.py:151` SubmitRequest 字段类型可能为 `Optional[str]`
- **影响**: 表单校验缺失，前端可能误提交
- **修复**: Pydantic 加 `min_length=1, max_length=100`
- **Bug 文档**: [docs/bugs/2026-09-15-tvc-projects-missing-name-200.md](../../docs/bugs/2026-09-15-tvc-projects-missing-name-200.md)
- **工作量**: 5min

### BUG-004 — GET /tvc-projects/{无效 UUID} 返回 500
- **现象**: 无效 UUID（如 `__totally-not-real__`）→ 500 而非 404
- **根因**: `tvc_projects.py:172` handler 没用 `try UUID(x)` 校验
- **影响**: 触发 Sentry 告警，RESTful 规范违反
- **修复**: handler 入口 `try: pid = UUID(x) except: raise 404`
- **Bug 文档**: [docs/bugs/2026-09-15-tvc-projects-uuid-500.md](../../docs/bugs/2026-09-15-tvc-projects-uuid-500.md)
- **同类端点**: `tvc_engine.py /{task_id}` / `tvc-projects /{id}/shots` 都要同样修复
- **工作量**: ~20min

## 修复顺序建议

| 步骤 | Bug | 工作量 | 风险 |
|------|-----|--------|------|
| 1 | BUG-003 (P2) | 5min | 极低 |
| 2 | BUG-004 (P2) | 20min | 低（加 try/except）|
| 3 | BUG-001 (P1) | 2h | 中（要写新 helper + 单测）|
| 4 | BUG-002 (链路) | 1h | 中（要改 execute_tvc 主循环）|

**总工作量**: ~3.5h，可 1 个 session 搞定。

## 验证脚本

修完后跑：
```bash
# BUG-001 修复后
PROD_URL=https://app.nanoai.fun/nanoai npx playwright test e2e/tvc-coverage.spec.ts \
  --project=chromium -g "E1|E2|E3|J\." --reporter=list

# BUG-002 修复后
PROD_URL=https://app.nanoai.fun/nanoai npx playwright test e2e/tvc-betel-promo.spec.ts \
  --project=chromium --reporter=list
# 期望：任务跑通到 step-images 或 step-video

# BUG-003/004 修复后
PROD_URL=https://app.nanoai.fun/nanoai npx playwright test e2e/tvc-coverage.spec.ts \
  --project=chromium -g "C8|H3" --reporter=list
```

## 关联

- 全部 Bug 文档在 `docs/bugs/2026-09-15-*.md`
- 完整 E2E 报告: `e2e/reports/tvc-coverage-2026-09-15.md`
- 槟榔实跑报告: `e2e/reports/betel-promo-report.md`
- 测试工具链: `e2e/helpers/tvc.ts`（含 fetch SSE + 错误捕获）
- 规划文档: [tvc-e2e-coverage.md](tvc-e2e-coverage.md)
