"""
MiniMax API 代理路由 - 文本/剧本生成
前端通过此接口调用 MiniMax，API Key 安全存储在后端
支持模型：abab6.5s-chat (MiniMax-Text-01)
"""

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.config import get_settings
from app.api.auth import get_current_user_optional
from app.models import User


def _repair_json(raw: str) -> str:
    """Multi-layer JSON repair for model output quirks."""
    import re as _re

    s = raw

    # 1. Strip trailing commas before ] or }
    s = _re.sub(r',\s*([}\]])', r'\1', s)

    # 2. Remove JS-style comments
    s = _re.sub(r'//.*?\n', '\n', s)

    # 3. Remove control characters (keep \n \t)
    s = _re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', ' ', s)

    # 4. Fix missing commas between array elements / object properties
    s = _re.sub(r'(["}\]])\s*\n\s*(["{\[])', r'\1,\n\2', s)

    # 5. Escape unescaped quotes inside string values
    result = []
    in_string = False
    i = 0
    while i < len(s):
        ch = s[i]
        if in_string:
            if ch == '\\' and i + 1 < len(s):
                result.append(ch)
                result.append(s[i + 1])
                i += 2
                continue
            elif ch == '"':
                rest = s[i + 1:].lstrip()
                if rest and rest[0] not in (',', ']', '}', ':', '\n'):
                    result.append('\\"')
                    i += 1
                    continue
                else:
                    in_string = False
                    result.append(ch)
            else:
                result.append(ch)
        else:
            if ch == '"':
                in_string = True
                result.append(ch)
            else:
                result.append(ch)
        i += 1

    return ''.join(result)


def _find_balanced(text: str, open_ch: str, close_ch: str) -> str | None:
    """Bracket-count to find first complete balanced JSON structure."""
    start = text.find(open_ch)
    if start < 0:
        return None
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text)):
        c = text[i]
        if escape:
            escape = False
            continue
        if c == '\\' and in_str:
            escape = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return text[start:i+1]
    return None


router = APIRouter(prefix="/api/minimax", tags=["minimax"])


class MiniMaxScreenplayRequest(BaseModel):
    premise: str
    shot_count: int = 6
    style: Optional[str] = "realistic"
    quality: Optional[str] = "hd"
    model: str = "MiniMax-M2.7"
    temperature: float = 0.7


STYLE_MAP = {
    "realistic": "写实风格，真实照片级，电影级光影",
    "anime": "日系动画风格，赛璐璐上色，鲜明色彩",
    "comic": "美式漫画风格，粗犷线条，动态构图",
    "watercolor": "水彩画风格，柔和晕染，轻盈通透",
    "oil_painting": "油画风格，厚涂质感，丰富肌理，经典艺术",
    "chinese": "中国水墨画风格，留白意境，淡雅笔触",
}

SCREENPLAY_PROMPT = """你是一个专业的电影编剧和分镜设计师。根据用户提供的故事梗概，生成一份完整的 TVC 广告剧本。

## 输出要求
严格按以下 JSON 格式输出，不要添加任何其他文字：

{{
  "tvc_title": "广告标题",
  "total_duration": {total_duration},
  "shot_duration": {shot_duration},
  "shot_count": {shot_count},
  "shots": [
    {{
      "shot_id": 1,
      "timeline": {{
        "start": "00:00",
        "end": "00:05",
        "duration": 5,
        "transition": "fade_in"
      }},
      "scene_description": "这个镜头发生了什么（中文，简短）",
      "video_prompt": "English prompt for video generation, under 200 words. Focus on action, camera movement, lighting, atmosphere.",
      "start_frame_prompt": "起始帧图片提示词（中文，50字以内）",
      "end_frame_prompt": "结束帧图片提示词（中文，50字以内）",
      "bgm_mood": "风格,情绪,乐器"
    }}
  ],
  "timeline_summary": {{
    "total_duration": 30,
    "shot_count": 6,
    "shot_duration": 5,
    "transitions": ["fade_in", "cut", "cut", "dissolve", "cut", "fade_out"]
  }}
}}

## video_prompt 编写规则
1. 必须使用英文
2. 格式：[主体动作] + [镜头运动] + [环境/光线] + cinematic, high quality
3. 不超过 200 词
4. 包含：画面主体、光线、构图、情绪

## scene_description 编写规则
1. 使用中文
2. 简短描述镜头发生的故事
3. 突出角色动作和情感

## start_frame_prompt / end_frame_prompt 编写规则
1. 中文，50字以内
2. 包含：画面主体 + 光线 + 构图
3. 起始帧和结束帧之间有视觉连续性

## bgm_mood 格式
[风格],[情绪],[乐器]"""


@router.post("/screenplay")
async def generate_minimax_screenplay(
    req: MiniMaxScreenplayRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """使用 MiniMax abab6.5s-chat 生成 TVC 剧本"""
    import json, re
    settings = get_settings()
    if not settings.MINIMAX_API_KEY:
        raise HTTPException(status_code=500, detail="MiniMax API Key 未配置")

    style_instruction = STYLE_MAP.get(req.style or "realistic", "")
    shot_duration = max(3, 30 // req.shot_count)
    total_duration = shot_duration * req.shot_count

    system_prompt = SCREENPLAY_PROMPT.format(
        shot_count=req.shot_count,
        shot_duration=shot_duration,
        total_duration=total_duration,
    )
    if style_instruction:
        system_prompt += f"\n\n画面风格：{style_instruction}"

    try:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{settings.MINIMAX_API_BASE_URL}/text/chatcompletion_v2",
                headers={
                    "Content-Type": "application/json;charset=utf-8",
                    "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                },
                json={
                    "model": req.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"请根据以下故事梗概生成 TVC 广告剧本：\n{req.premise}"},
                    ],
                    "temperature": req.temperature,
                    "max_tokens": 8000,
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"MiniMax API 错误: {resp.text}")

        data = resp.json()
        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", -1) not in (0, 200):
            raise HTTPException(status_code=502, detail=f"MiniMax 错误: {base_resp.get('status_msg')}")

        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()
        # MiniMax-M2.7 reasoning model puts text in reasoning_content when content is empty
        if not content and msg.get("reasoning_content"):
            content = msg.get("reasoning_content", "").strip()

        if not content:
            raise HTTPException(status_code=502, detail=f"MiniMax 返回为空（reasoning_content={bool(msg.get('reasoning_content'))}）")

        # Extract JSON
        json_str = None
        m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if m:
            json_str = _find_balanced(m.group(1), '{', '}')
        if not json_str:
            m = re.search(r'<output>([\s\S]*?)</output>', content)
            if m:
                json_str = _find_balanced(m.group(1), '{', '}')
        if not json_str:
            json_str = _find_balanced(content, '{', '}')

        if not json_str:
            raise HTTPException(status_code=502, detail=f"无法解析剧本: {content[:200]}")

        try:
            screenplay = json.loads(json_str)
        except json.JSONDecodeError:
            cleaned = _repair_json(json_str)
            screenplay = json.loads(cleaned)

        # Validate and fill defaults
        screenplay.setdefault("tvc_title", "未命名TVC")
        screenplay.setdefault("total_duration", total_duration)
        screenplay.setdefault("shot_duration", shot_duration)
        screenplay.setdefault("shot_count", req.shot_count)
        screenplay.setdefault("shots", [])
        screenplay.setdefault("timeline_summary", {})

        for idx, shot in enumerate(screenplay["shots"]):
            if not isinstance(shot, dict):
                continue
            shot.setdefault("shot_id", idx + 1)
            shot.setdefault("timeline", {
                "start": f"{(idx * shot_duration) // 60:02d}:{(idx * shot_duration) % 60:02d}",
                "end": f"{((idx + 1) * shot_duration) // 60:02d}:{((idx + 1) * shot_duration) % 60:02d}",
                "duration": shot_duration,
                "transition": "fade_in" if idx == 0 else ("fade_out" if idx == len(screenplay["shots"]) - 1 else "cut"),
            })
            shot.setdefault("scene_description", "")
            shot.setdefault("video_prompt", "")
            shot.setdefault("start_frame_prompt", "")
            shot.setdefault("end_frame_prompt", "")
            shot.setdefault("bgm_mood", "")

        return {"screenplay": screenplay}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="MiniMax API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
