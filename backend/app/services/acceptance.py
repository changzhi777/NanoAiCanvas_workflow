"""TVC 验收标准审查服务（方案 2：旁挂服务）。

两道闸：
- run_script_gate：剧本生成后，规则层 + LLM 文本层审查（glm-5.3，经 _glm_chat）
- run_final_gate：全链完成后，ffprobe 规格 + 抽帧 M3 视觉审查 + 规则层合并

核心约定：
- 审查失败/模型不可用 → status=unverified，不抛异常（不拖死主链）
- veto 项命中 → score 压至 ≤20 且 status=failed
- 百分比 = Σ(pass×weight)/Σ(weight)×100（veto 以外项）
"""
import asyncio
import base64
import json
import logging
import re
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

REVIEW_TEXT_MODEL = "glm-5.3"
REVIEW_VISUAL_MODEL = "MiniMax-M3"
FRAME_COUNT = 6


# ==================== 评分 ====================

def compute_score(items: list[dict]) -> tuple[int, list[str]]:
    """分级加权评分。返回 (score 0-100, veto_hit keys)。

    veto 命中任一 → score 上限 20；archive 不参与；pass=None（待成片/未提供）不进分母。
    """
    scored = [it for it in items
              if it.get("category") != "archive" and it.get("pass") is not None]
    total_weight = sum(it.get("weight", 0) for it in scored) or 1
    passed_weight = sum(it.get("weight", 0) for it in scored if it.get("pass"))
    score = round(passed_weight / total_weight * 100)

    veto_hit = [it["key"] for it in items if it.get("veto") and it.get("pass") is False]
    if veto_hit:
        score = min(score, 20)
    return score, veto_hit


def extract_conflicts_top(items: list[dict], limit: int = 3) -> list[dict]:
    """取前 N 个失败项作为主要冲突点（veto 优先，按权重降序）。仅 pass=False，待判(None)不算冲突。"""
    failed = [it for it in items if it.get("pass") is False and it.get("category") != "archive"]
    failed.sort(key=lambda it: (not it.get("veto"), -it.get("weight", 0)))
    return [
        {"key": it["key"], "label": it.get("label", it["key"]),
         "conflict": it.get("conflict", ""), "standard_ref": it.get("standard_ref", "")}
        for it in failed[:limit]
    ]


# ==================== 规则层 ====================

def _script_text_fields(parsed_script: dict) -> dict:
    """从剧本提取可检索文本。"""
    shots = parsed_script.get("shots") or []
    all_text_parts = [str(parsed_script.get("tvc_title") or ""), str(parsed_script.get("logline") or "")]
    for s in shots:
        all_text_parts.append(str(s.get("scene_description") or ""))
        all_text_parts.append(str(s.get("video_prompt") or ""))
        for d in s.get("dialogue") or []:
            all_text_parts.append(str(d.get("line") or ""))
    if parsed_script.get("narration"):
        all_text_parts.append(str(parsed_script.get("narration")))
    return {"all_text": "\n".join(all_text_parts)}


def _match_price(text: str) -> bool:
    """价格模式：39.9元 / 29 块 9 / 二十九块 / 9.9 等（含中文数字）。"""
    return bool(re.search(r"(?:\d{1,3}(?:\.\d{1,2})?|[一二两三四五六七八九十百]+)\s*(?:元|块)", text))


def rule_check(criteria: list[dict], *, parsed_script: dict | None = None,
               brief_ctx: dict | None = None, video_meta: dict | None = None) -> list[dict]:
    """纯函数规则审查。video_meta: {width, height, duration}（成片闸）。

    返回已判定项列表；模型类项原样带过（由 LLM 层补齐）。
    """
    results = []
    text = _script_text_fields(parsed_script or {})["all_text"] if parsed_script else ""
    for c in criteria or []:
        item = {"key": c["key"], "label": c.get("label", c["key"]),
                "category": c.get("category"), "weight": c.get("weight", 0),
                "veto": c.get("veto", False), "pass": None,
                "conflict": "", "standard_ref": c.get("prompt_hint") or "", "actual": ""}
        rule = c.get("rule") or {}
        rtype = rule.get("type")

        if rtype == "aspect_ratio":
            expect = rule.get("expect", "9:16")
            actual = video_meta.get("aspect_ratio", "") if video_meta else ""
            item["pass"] = (actual == expect) if actual else None
            item["actual"] = actual or "待成片"
            if item["pass"] is False:
                item["conflict"] = f"画面比例 {actual}，要求 {expect}"
        elif rtype == "duration":
            expect, tol = rule.get("expect_sec", 15), rule.get("tolerance", 2)
            dur = video_meta.get("duration") if video_meta else None
            if dur:
                item["pass"] = abs(float(dur) - expect) <= tol
                item["actual"] = f"{float(dur):.1f}s"
                if not item["pass"]:
                    item["conflict"] = f"时长 {dur}s，要求 {expect}±{tol}s"
            else:
                item["pass"] = None
                item["actual"] = "待成片"
        elif rtype == "text_contains":
            source = rule.get("source")
            needle = str((brief_ctx or {}).get(source) or "").strip()
            if not needle or not text:
                item["pass"] = None  # Brief 未提供该字段，跳过判定
            else:
                hit = needle in text
                if source == "price_info":
                    hit = hit or _match_price(text)
                item["pass"] = hit
                item["actual"] = "命中" if hit else f"未出现「{needle[:40]}」"
                if not hit:
                    item["conflict"] = f"必现信息缺失：{needle[:60]}"
        elif rtype == "archive":
            item["pass"] = True  # 存档项不判失败
            item["actual"] = str((brief_ctx or {}).get(rule.get("source")) or "")
        results.append(item)
    return results


# ==================== LLM 文本层（剧本闸） ====================

_SCRIPT_REVIEW_PROMPT = """你是广告片验收审查员。对照客户 Brief 标准，审查以下 TVC 脚本 JSON。

## Brief 标准（仅审查 llm_content 类项）
{criteria_block}

## Brief 上下文
{brief_block}

## 脚本 JSON
{script_json}

## 输出要求
只输出 JSON 数组（不要 markdown 代码块），每项：
[{{"key": "...", "pass": true/false, "conflict": "失败原因一句话", "actual": "实际看到什么", "advice": "修改建议一句话"}}]
pass 无法判定时用 null。key 必须与标准项 key 一致，逐项输出。"""


async def llm_content_review(criteria: list[dict], parsed_script: dict,
                             brief_ctx: dict) -> list[dict]:
    """glm-5.3 文本审查 llm_content 项。模型失败抛异常（由上层降级）。"""
    from app.api.v2.glm_proxy import _glm_chat

    llm_items = [c for c in criteria if c.get("category") == "llm_content"]
    if not llm_items:
        return []
    criteria_block = "\n".join(
        f"- key={c['key']} {c.get('label')}：{c.get('prompt_hint') or ''}" for c in llm_items
    )
    brief_block = json.dumps(brief_ctx or {}, ensure_ascii=False)[:2000]
    script_json = json.dumps(parsed_script, ensure_ascii=False)[:6000]

    resp = await _glm_chat(
        REVIEW_TEXT_MODEL,
        [{"role": "user", "content": _SCRIPT_REVIEW_PROMPT.format(
            criteria_block=criteria_block, brief_block=brief_block, script_json=script_json)}],
        temperature=1.0, max_tokens=4000,
        thinking=False,  # 用户指令：glm-5.3 审查不开 thinking（结构化输出无需 reasoning，省时省 token）
    )
    raw = resp["choices"][0]["message"]["content"]
    return _parse_llm_json(raw, llm_items)


# ==================== 视觉层（成片闸，MiniMax-M3） ====================

_VISUAL_REVIEW_PROMPT = """你是广告片验收审查员。这是同一支 TVC 的 {n} 张抽帧图{ref_part}。
对照标准逐项审查：

{criteria_block}

输出 JSON 数组（不要 markdown），每项：
[{{"key": "...", "pass": true/false/null, "conflict": "...", "actual": "...", "advice": "..."}}]
key 逐项对应，无法判定 pass=null。"""


def _build_m3_image_block(image_b64: str) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64}}


async def m3_visual_review(frames_b64: list[str], criteria: list[dict],
                           ref_images: list[str] | None = None,
                           settings=None) -> list[dict]:
    """M3 视觉审查 llm_visual 项。多帧一次请求（token 友好）。"""
    import os
    api_key = getattr(settings, "MINIMAX_API_KEY", "") or os.environ.get("MINIMAX_API_KEY", "")
    if not api_key:
        raise RuntimeError("MINIMAX_API_KEY 未配置")
    base_url = getattr(settings, "MINIMAX_API_BASE_URL", "https://api.minimax.cn/v1")
    anthropic_base = base_url.rstrip("/").removesuffix("/v1")

    llm_items = [c for c in criteria if c.get("category") == "llm_visual"]
    if not llm_items:
        return []
    criteria_block = "\n".join(
        f"- key={c['key']} {c.get('label')}：{c.get('prompt_hint') or ''}" for c in llm_items
    )

    content: list[dict] = []
    for f in frames_b64:
        content.append(_build_m3_image_block(f))
    if ref_images:
        content.append({"type": "text", "text": "（参照图：产品 KV / IP 设定）"})
        for r in ref_images[:2]:
            # URL 走 url-source，裸 base64 / data URI 走 base64-source（URL 塞 base64 会 400）
            if r.startswith("http://") or r.startswith("https://"):
                content.append({"type": "image", "source": {"type": "url", "url": r}})
            else:
                content.append(_build_m3_image_block(r))
    content.append({"type": "text", "text": _VISUAL_REVIEW_PROMPT.format(
        n=len(frames_b64),
        ref_part="（最后附参照图）" if ref_images else "",
        criteria_block=criteria_block,
    )})

    body = {"model": REVIEW_VISUAL_MODEL, "max_tokens": 2000,
            "messages": [{"role": "user", "content": content}], "temperature": 0.2}
    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(f"{anthropic_base}/anthropic/v1/messages", headers=headers, json=body)
    if resp.status_code != 200:
        raise RuntimeError(f"M3 visual review HTTP {resp.status_code}: {resp.text[:150]}")
    data = resp.json()
    raw = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    return _parse_llm_json(raw, llm_items)


# ==================== 公共 ====================

def _parse_llm_json(raw: str, llm_items: list[dict]) -> list[dict]:
    """解析 LLM JSON 数组，容错 markdown 包裹/尾逗号。解析失败抛 ValueError。"""
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.S)
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end <= start:
        raise ValueError(f"LLM 输出无 JSON 数组: {raw[:120]}")
    arr = json.loads(text[start:end + 1])
    by_key = {c["key"]: c for c in llm_items}
    out = []
    for it in arr:
        key = it.get("key")
        if key not in by_key:
            continue
        c = by_key[key]
        out.append({"key": key, "label": c.get("label", key),
                    "category": c.get("category"), "weight": c.get("weight", 0),
                    "veto": c.get("veto", False),
                    "pass": it.get("pass") if isinstance(it.get("pass"), bool) else None,
                    "conflict": str(it.get("conflict") or ""),
                    "standard_ref": c.get("prompt_hint") or "",
                    "actual": str(it.get("actual") or ""),
                    "advice": str(it.get("advice") or "")})
    return out


def merge_items(*item_groups: list[dict]) -> list[dict]:
    """合并多层审查结果：同 key 后组覆盖前组（纯净合并，不做 None 转换）。"""
    merged: dict[str, dict] = {}
    for group in item_groups:
        for it in group:
            merged[it["key"]] = it
    return list(merged.values())


def _finalize(items: list[dict], judged_keys: set[str]) -> list[dict]:
    """本闸 LLM 应判但拒判（pass=None）的项 → False + 人工复核。"""
    for it in items:
        if it["key"] in judged_keys and it.get("pass") is None:
            it["pass"] = False
            it["conflict"] = it["conflict"] or "自动审查无法判定，建议人工复核"
    return items


# ==================== 抽帧与视频元信息 ====================

async def probe_video(video_url: str) -> dict:
    """ffprobe 取分辨率/时长/比例。失败返回空 dict（上层降级）。"""
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height:format=duration",
        "-of", "json", video_url,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
    except asyncio.TimeoutError:
        proc.kill()
        return {}
    if proc.returncode != 0:
        return {}
    try:
        data = json.loads(out.decode())
        stream = (data.get("streams") or [{}])[0]
        w, h = int(stream.get("width", 0)), int(stream.get("height", 0))
        dur = float(data.get("format", {}).get("duration", 0))
        ratio = "9:16" if h > w else ("16:9" if w > h else "")
        return {"width": w, "height": h, "duration": dur, "aspect_ratio": ratio}
    except (json.JSONDecodeError, ValueError, TypeError):
        return {}


async def extract_frames(video_url: str, n: int = FRAME_COUNT) -> list[str]:
    """均匀抽 n 帧 → base64 jpeg 列表。失败抛异常（上层降级 unverified）。"""
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", video_url,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate()
    try:
        duration = float(out.decode().strip())
    except ValueError:
        raise RuntimeError("ffprobe 无法读取视频时长")

    tasks = []
    for i in range(n):
        ts = duration * (i + 0.5) / n
        tasks.append(_extract_single_frame(video_url, ts))
    frames = await asyncio.gather(*tasks, return_exceptions=True)
    ok = [f for f in frames if isinstance(f, str) and f]
    if not ok:
        raise RuntimeError("抽帧全部失败")
    return ok


async def _extract_single_frame(video_url: str, ts: float) -> Optional[str]:
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-v", "error", "-ss", f"{ts:.2f}", "-i", video_url,
        "-frames:v", "1", "-vf", "scale=512:-2", "-q:v", "7", "-f", "image2pipe", "-c:v", "mjpeg", "-",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
    except asyncio.TimeoutError:
        proc.kill()
        return None
    if proc.returncode != 0 or not out:
        return None
    return base64.b64encode(out).decode()


# ==================== 两道闸入口 ====================

def _unverified_report(gate: str, reason: str) -> dict:
    return {"gate": gate, "status": "unverified", "score": 0, "veto_hit": [],
            "items": [], "conflicts_top": [{"key": "_service", "label": "审查服务",
                                            "conflict": f"审查暂不可用：{reason}", "standard_ref": ""}],
            "model_meta": {"error": reason}}


async def run_script_gate(task_id: str, parsed_script: dict, template: dict) -> dict:
    """剧本闸：规则层 + LLM 文本层。永不抛异常。"""
    criteria = template.get("criteria") or []
    brief_ctx = template.get("brief_ctx") or {}
    try:
        rule_items = rule_check(criteria, parsed_script=parsed_script, brief_ctx=brief_ctx)
        llm_items = await llm_content_review(criteria, parsed_script, brief_ctx)
        items = merge_items(rule_items, llm_items)
        # llm_visual 属成片闸（抽帧后才有画面），剧本闸剔除
        items = [it for it in items if it.get("category") != "llm_visual"]
        items = _finalize(items, {it["key"] for it in llm_items})
        score, veto_hit = compute_score(items)
        return {"gate": "script", "status": "failed" if veto_hit or score < 60 else "passed",
                "score": score, "veto_hit": veto_hit, "items": items,
                "conflicts_top": extract_conflicts_top(items),
                "model_meta": {"text_model": REVIEW_TEXT_MODEL}}
    except Exception as e:
        logger.warning(f"[acceptance] script gate failed task={task_id}: {e}")
        return _unverified_report("script", str(e)[:150])


async def run_final_gate(task_id: str, video_url: str, parsed_script: dict,
                         template: dict, ref_images: list[str] | None = None,
                         settings=None, script_items: list[dict] | None = None) -> dict:
    """成片闸：ffprobe 规格 + 抽帧 M3 视觉 + 规则合并。永不抛异常。

    script_items：剧本闸报告 items（携带 llm_content 判定，避免重复审查）。
    """
    criteria = template.get("criteria") or []
    brief_ctx = template.get("brief_ctx") or {}
    try:
        video_meta = await probe_video(video_url)
        rule_items = rule_check(criteria, parsed_script=parsed_script,
                                brief_ctx=brief_ctx, video_meta=video_meta)
        frames = await extract_frames(video_url)
        visual_items = await m3_visual_review(frames, criteria, ref_images, settings)
        items = merge_items(script_items or [], rule_items, visual_items)
        items = _finalize(items, {it["key"] for it in visual_items})
        score, veto_hit = compute_score(items)
        return {"gate": "final", "status": "failed" if veto_hit or score < 60 else "passed",
                "score": score, "veto_hit": veto_hit, "items": items,
                "conflicts_top": extract_conflicts_top(items),
                "model_meta": {"visual_model": REVIEW_VISUAL_MODEL,
                               "frames": len(frames), "video_meta": video_meta}}
    except Exception as e:
        logger.warning(f"[acceptance] final gate failed task={task_id}: {e}")
        return _unverified_report("final", str(e)[:150])
