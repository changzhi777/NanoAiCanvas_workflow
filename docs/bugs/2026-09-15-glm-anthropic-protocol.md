# Bug: GLM-5.3-Flash 走错协议池（OpenAI 协议无配额）

**严重度**: 🟠 高（阻断 TVC step-optimize）
**优先级**: P1
**发现时间**: 2026-09-15
**发现来源**: `e2e/tvc-coverage.spec.ts` J1-J3 + 槟榔 TVC 实跑三轮
**环境**: https://app.nanoai.fun/nanoai（生产）

## 现象

后端 `POST /api/glm/optimize` 调用 GLM-5.3-Flash 时返回 1310/1113 错误：

```
GLM API error: {"type":"error","error":{"type":"rate_limit_error","code":"1310",
"message":"[1310][您已达到每周/每月使用上限，您的限额将在 2026-09-15 23:08:55 重置。]"}}
```

或：

```
GLM API error: {"code":"1113","message":"余额不足或无可用资源包,请充值。"}
```

但用**同一个 key** 直接调用 GLM Anthropic 端点 → 200 成功。

## 复现

### 后端（生产，已 fail）

```bash
curl -sk -X POST https://app.nanoai.fun/nanoai/api/glm/optimize \
  -H "Authorization: Bearer ${ZHY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"一只猫","step":"image","model":"glm-5.3-flash"}'

# 实际：HTTP 500 + detail 含 1310 / 1113
# 预期：HTTP 200 + 优化后提示词
```

### 直连 GLM（OpenAI 协议，同 key）

```bash
curl -sk -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer ${GLM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-5.3-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'

# 实际：{"error":{"code":"1113","message":"余额不足..."}}
```

### 直连 GLM（Anthropic 协议，同 key）✅

```bash
curl -sk -X POST https://open.bigmodel.cn/api/anthropic/v1/messages \
  -H "x-api-key: ${GLM_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-5.3-flash","max_tokens":60,"messages":[{"role":"user","content":"hi"}]}'

# 实际：HTTP 200 + 真实响应
# {"id":"msg_20260915113004e05c4880e2564ac5","type":"message","role":"assistant",
#  "model":"glm-5.3-flash","content":[{"type":"thinking","thinking":"..."},...]}
```

## 根因

**GLM Coding Plan 把 GLM-5.3-Flash 单独放在 Anthropic 协议配额池**（智谱官方文档"GLM-5.3-Flash 已全量上线 GLM Coding Plan 额度翻 3 倍"明确指 Anthropic 协议）。

后端 `backend/app/api/v2/glm_proxy.py` 的几个关键调用：

| 位置 | 端点 | 协议 | 影响 |
|------|------|------|------|
| line 177 `ANTHROPIC_GLM_URL` | `https://open.bigmodel.cn/api/anthropic/v1/messages` | Anthropic | ✅ 配 GLM-5.3-Flash OK |
| line 1108 `_glm_chat` for `/tvc-script` | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | OpenAI | ❌ 拿不到 GLM-5.3-Flash 配额 |
| line 1165 `_glm_chat` for `/optimize` | 同上 | OpenAI | ❌ step-optimize 死锁 |

`/api/glm/optimize` 走 `_glm_chat` (line 350) → OpenAI 协议 → 1310/1113。TVC step-optimize 调这个端点，永远拿不到 GLM-5.3-Flash 配额池。

## 影响

- **TVC step-optimize 全部硬挂**（即使 GLM Coding Plan 已升级 + 有额度）
- 槟榔 TVC 实跑三轮：每次都在 step-optimize 失败（fail @ 20%）
- 整体 TVC 任务完成率：5/6 步
- 业务影响：用户提交 TVC 任务只能拿到剧本，提示词优化+后续步骤全断

## 修复建议

### 方案 A（推荐）：新增 `_glm_anthropic_chat` helper

```python
# backend/app/api/v2/glm_proxy.py 新增

async def _glm_anthropic_chat(
    model: str,
    messages: list[dict],
    system: str = None,
    max_tokens: int = 1024,
    temperature: float = 1.0,
    thinking: bool = True,
) -> str:
    """GLM Anthropic 协议调用 — 支持 GLM-5.3-Flash 等 Coding Plan 专属模型"""
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    # 转换 messages 格式（OpenAI → Anthropic）
    anthropic_messages = [{"role": m["role"], "content": m["content"]}
                          for m in messages if m["role"] in ("user", "assistant")]
    # 合并连续 user 消息
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": anthropic_messages,
    }
    if system:
        payload["system"] = system
    if thinking and model.startswith("glm-5"):
        payload["thinking"] = {"type": "enabled"}
    if temperature != 1.0:
        payload["temperature"] = temperature

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://open.bigmodel.cn/api/anthropic/v1/messages",
            headers={
                "x-api-key": settings.GLM_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"GLM API 错误: {r.text[:300]}")

        result = r.json()
        # 取最后一个 text 块（跳过 thinking）
        texts = [c["text"] for c in result.get("content", []) if c.get("type") == "text"]
        return texts[-1] if texts else ""
```

然后改 `/optimize` 和 `/tvc-script`：
```python
# /optimize handler
data = await _glm_anthropic_chat(
    model=req.model,
    messages=[{"role": "user", "content": user_content}],
    system=system_prompt,
    max_tokens=2000,
    thinking=True,
)
```

### 方案 B：按模型自动路由

```python
ANTHROPIC_ONLY_MODELS = {"glm-5.3-flash", "glm-5", "glm-5-flash"}

def _pick_endpoint(model: str) -> tuple[str, str]:
    """返回 (url, auth_header_name)"""
    if model in ANTHROPIC_ONLY_MODELS:
        return ("https://open.bigmodel.cn/api/anthropic/v1/messages", "x-api-key")
    return ("https://open.bigmodel.cn/api/paas/v4/chat/completions", "Authorization")
```

## 验证

修复后跑：
1. `e2e/tvc-coverage.spec.ts` E1（`/api/glm/optimize` GLM-5.3-Flash）应 200
2. `e2e/tvc-betel-promo.spec.ts` 槟榔实跑应通过 step-optimize 跑到 step-images
3. 后端日志不再有 "1310 / 1113 余额不足"（GLM 路径下）

## 关联

- 测试用例: `e2e/tvc-coverage.spec.ts:566-664`（J 段）
- 实跑报告: `e2e/reports/betel-promo-report.md`（三轮失败 @ step-optimize）
- 后端代码: `backend/app/api/v2/glm_proxy.py:177, 1108, 1165`
- 规格参考: [GLM-5.3-Flash 官方文档](https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3-flash)
- 相关 PR: 暂无
- 状态: **待修复**（不在本任务执行）
