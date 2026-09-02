"""
import logging; logger = logging.getLogger(__name__)
GLM API 代理路由 - 提示词优化
前端通过此接口调用 GLM，API Key 安全存储在后端
支持模型：glm-4.5-air, glm-4-flash, glm-4, glm-4.7-flash
"""

import httpx
from fastapi import APIRouter, HTTPException, Depends
from starlette.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.config import get_settings
from app.api.auth import get_current_user_optional
from app.models import User

def _repair_json(raw: str) -> str:
    """Multi-layer JSON repair for GLM output quirks."""
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


def _extract_shots_from_content(content: str) -> list:
    """Extract shots from GLM output, handling multiple formats:
    1. {"title":..., "shots":[...]}  (standard)
    2. [{"shot_number":1, ...}, ...]  (bare array)
    3. Truncated JSON with incomplete shots
    """
    import json, re

    json_str = None

    # 1. Code block — capture content, then bracket-count
    m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
    if m:
        json_str = _find_balanced(m.group(1), '{', '}') or _find_balanced(m.group(1), '[', ']')

    # 2. <output> tag
    if not json_str:
        m = re.search(r'<output>([\s\S]*?)</output>', content)
        if m:
            json_str = _find_balanced(m.group(1), '{', '}') or _find_balanced(m.group(1), '[', ']')

    # 3. Raw content fallback
    if not json_str:
        json_str = _find_balanced(content, '{', '}') or _find_balanced(content, '[', ']')

    if not json_str:
        return []

    # Attempt parse, then repair
    for attempt in range(2):
        try:
            parsed = json.loads(json_str)
            break
        except json.JSONDecodeError:
            if attempt == 0:
                json_str = _repair_json(json_str)
            else:
                # Final fallback: try to extract individual shot objects via regex
                shots = []
                for m in re.finditer(r'\{[^{}]*"shot_number"\s*:\s*\d+[^{}]*\}', json_str):
                    try:
                        shot = json.loads(m.group())
                        shots.append(shot)
                    except json.JSONDecodeError:
                        continue
                return shots

    # Normalize to shots list
    if isinstance(parsed, list):
        shots = parsed
    elif isinstance(parsed, dict):
        shots = parsed.get("shots", [])
        # If shots is empty but dict has shot-like fields, treat it as single shot
        if not shots and "shot_number" in parsed:
            shots = [parsed]
    else:
        return []

    # Normalize each shot: only keep expected fields, fill missing
    normalized = []
    for idx, shot in enumerate(shots):
        if not isinstance(shot, dict):
            continue
        normalized.append({
            "shot_number": shot.get("shot_number", idx + 1),
            "scene_description": shot.get("scene_description", ""),
            "visual_prompt": shot.get("visual_prompt", shot.get("description", "")),
            "camera_angle": shot.get("camera_angle", ""),
            "mood": shot.get("mood", ""),
        })

    return normalized


router = APIRouter(prefix="/api/glm", tags=["glm"])


ANTHROPIC_GLM_URL = "https://open.bigmodel.cn/api/anthropic/v1/messages"


def _convert_content(content) -> list:
    """v4 content（str 或 块数组）→ Anthropic content 块数组（图片 image_url → image source）。"""
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    blocks = []
    for b in content:
        if b.get("type") == "text":
            blocks.append({"type": "text", "text": b.get("text", "")})
        elif b.get("type") == "image_url":
            url = b.get("image_url", {}).get("url", "")
            if url.startswith("data:"):
                header, b64 = url.split(",", 1)
                media = header.split(";")[0].split(":")[1] or "image/png"
                blocks.append({"type": "image", "source": {"type": "base64", "media_type": media, "data": b64}})
            else:
                blocks.append({"type": "image", "source": {"type": "url", "url": url}})
    return blocks


async def _glm_chat(model: str, messages: list, temperature: float = 0.7, max_tokens: int = 500) -> dict:
    """GLM Coding 套餐 key 走 Anthropic 兼容端点；入参/返回保持 v4 chat/completions 形状。

    返回 {"choices": [{"message": {"content": str, "reasoning_content": str}}]}，
    非 200 时抛 HTTPException(502)（与原 v4 直调语义一致）。
    """
    system = "\n".join(m["content"] for m in messages if m["role"] == "system" and isinstance(m["content"], str))
    chat = [{"role": m["role"], "content": _convert_content(m["content"])} for m in messages if m["role"] != "system"]
    payload = {"model": model, "max_tokens": max_tokens, "messages": chat, "temperature": temperature}
    if system:
        payload["system"] = system
    settings = get_settings()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            ANTHROPIC_GLM_URL,
            headers={
                "Content-Type": "application/json",
                "x-api-key": settings.GLM_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            json=payload,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GLM API 错误: {resp.text}")
    data = resp.json()
    text, thinking = "", ""
    for block in data.get("content", []):
        if block.get("type") == "text":
            text += block.get("text", "")
        elif block.get("type") == "thinking":
            thinking += block.get("thinking", "")
    return {"choices": [{"message": {"content": text, "reasoning_content": thinking}}]}


class OptimizeRequest(BaseModel):
    prompt: str
    model: str = "glm-4.5-air"
    temperature: float = 0.8
    system_prompt_template: str = "storyboard"
    style: Optional[str] = "realistic"
    quality: Optional[str] = "standard"


class StoryboardScriptRequest(BaseModel):
    prompt: str
    shot_count: int = 6
    model: str = "glm-4.5-air"
    temperature: float = 0.7
    style: Optional[str] = "realistic"
    quality: Optional[str] = "standard"


class ScreenplayRequest(BaseModel):
    premise: str
    shot_count: int = 6
    shot_duration: int = 5
    total_duration: int = 30
    style: Optional[str] = "realistic"
    quality: Optional[str] = "hd"
    model: str = "glm-4.5-air"
    temperature: float = 0.7
    camera_movement: Optional[str] = None
    light_style: Optional[str] = None
    negative_prompts: Optional[list[str]] = None


STYLE_MAP = {
    "realistic": "写实风格，真实照片级，自然质感",
    "anime": "日系动画风格，赛璐璐上色，鲜明色彩",
    "comic": "美式漫画风格，粗犷线条，动态构图",
    "watercolor": "水彩画风格，柔和晕染，轻盈通透",
    "oil_painting": "油画风格，厚涂质感，丰富肌理，经典艺术",
    "chinese": "中国水墨画风格，留白意境，淡雅笔触",
    "cinematic": "电影感风格，cinematic film tone, 35mm 质感，电影级光影和色调",
    "commercial": "商业广告风格，clean commercial look，产品展示质感，明亮通透",
    "vintage": "复古胶片风格，film grain, analog vintage look，胶片颗粒感",
    "dreamy": "梦幻风格，dreamy, ethereal, soft focus，柔焦梦幻感",
    "documentary": "纪录片风格，documentary, handheld, natural light，自然纪实感",
    "moody": "情绪暗调风格，moody, desaturated, low-key lighting，低饱和暗调",
}

QUALITY_MAP = {
    "standard": "",
    "hd": "超高清画质，极致细节，锐利对焦，专业级品质，8K分辨率",
}


SYSTEM_PROMPTS = {
    "storyboard": "【应用场景：故事板分镜】你是一个专业的故事板分镜提示词优化专家。根据用户提供的故事描述、场景设定等信息，生成高质量的分镜图片提示词。优化规则：1.保留用户原始意图和核心故事内容 2.添加详细画面描述（角色动作、表情、构图）3.指定光影效果和氛围 4.描述镜头语言 5.明确画面风格和色调 6.使用中文输出 7.只输出优化后的提示词，不要添加解释或前缀",
    "character": "【应用场景：角色设计】你是一个专业的角色设计提示词优化专家。根据用户的角色描述，生成高质量的AI图片生成提示词。优化规则：1.详细描述角色的外貌、服装、表情和姿态 2.指定光影效果 3.明确画面构图和视角 4.指定画风 5.使用中文输出 6.只输出优化后的提示词，不要添加解释或前缀",
    "scene": "【应用场景：场景设计】你是一个专业的场景设计提示词优化专家。根据用户的场景描述，生成高质量的AI图片生成提示词。优化规则：1.详细描述场景的空间布局、建筑、自然环境 2.指定光影和氛围 3.明确镜头语言和透视 4.指定画风和色调 5.使用中文输出 6.只输出优化后的提示词，不要添加解释或前缀",
    "custom": "【应用场景：通用】你是一个专业的AI图片提示词优化专家。根据用户的描述，生成高质量的图片生成提示词。规则：1.保留用户原始意图 2.添加画面细节描述 3.使用中文输出 4.只输出优化后的提示词",
}

STORYBOARD_SCRIPT_PROMPT = """你是一个专业的电影分镜师和AI图片提示词专家。根据用户提供的故事描述，将其拆分为{shot_count}个连续的分镜头。

## visual_prompt 编写规则（最重要）
每个 shot 的 visual_prompt 是直接喂给AI图片生成器的提示词，必须遵循以下规则：
1. 开头描述画面主体（角色外貌、服装、动作、表情）
2. 描述场景背景（环境、建筑、自然元素、天气）
3. 指定光影效果（自然光/人造光、光源方向、色温）
4. 指定构图方式（三分法/对称/引导线、前景/中景/背景层次）
5. 指定镜头语言（景别+角度，如"低角度仰拍全景"、"特写"）
6. 描述色调和氛围（暖色调/冷色调、高对比/柔和）
7. 使用中文，50-100字

## 示例 visual_prompt
"一位身穿深蓝色风衣的男性站在雨后的城市天台上，右手握着一把伞，低头俯瞰灯火通明的街道。背景是现代都市的摩天大楼群，霓虹灯在湿漉漉的地面反射出斑斓色彩。暖色调路灯与冷色调天空形成冷暖对比，低角度仰拍，三分法构图，电影质感"

## 其他要求
1. 所有分镜头必须形成连续叙事，前后衔接自然
2. 镜头角度多样化：特写、中景、全景、俯拍、仰拍、跟拍等
3. 严格按以下JSON格式输出，不要添加任何其他文字：

{{
  "title": "故事标题",
  "shots": [
    {{
      "shot_number": 1,
      "scene_description": "这个镜头发生了什么，角色的动作和情感（简短叙述）",
      "visual_prompt": "按上述规则编写的详细图片生成提示词",
      "camera_angle": "镜头角度和景别",
      "mood": "氛围和情绪关键词"
    }}
  ]
}}"""


@router.post("/optimize")
async def optimize_prompt(
    req: OptimizeRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    system_prompt = SYSTEM_PROMPTS.get(req.system_prompt_template, SYSTEM_PROMPTS["storyboard"])
    # 注入风格和画质约束
    style_instruction = STYLE_MAP.get(req.style or "realistic", "")
    quality_instruction = QUALITY_MAP.get(req.quality or "standard", "")
    if style_instruction or quality_instruction:
        system_prompt += f"\n\n画面要求：{style_instruction}"
        if quality_instruction:
            system_prompt += f"。{quality_instruction}"
    # For reasoning models, append direct output instruction
    if req.model.startswith("glm-4.7"):
        system_prompt += "\n\n重要：请将最终优化结果放在 <output> 标签中，格式：<output>优化后的提示词</output>"
    user_content = f"请优化以下描述，生成图片提示词：\n{req.prompt}"

    try:
        data = await _glm_chat(
            model=req.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=req.temperature,
            max_tokens=500,
        )
        msg = data.get("choices", [{}])[0].get("message", {})
        optimized = msg.get("content", "").strip()
        # Reasoning models (glm-4.7) put output in reasoning_content
        if not optimized:
            rc = msg.get("reasoning_content", "").strip()
            if rc:
                # Try to extract <output> tag
                import re
                match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
                if match:
                    optimized = match.group(1).strip()
                else:
                    paragraphs = [p.strip() for p in rc.split("\n") if p.strip() and not p.strip().startswith("*") and len(p.strip()) > 10]
                    optimized = paragraphs[-1] if paragraphs else rc[-500:]
        if not optimized:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        return {"optimized_prompt": optimized}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/storyboard-script")
async def generate_storyboard_script(
    req: StoryboardScriptRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """生成结构化分镜头脚本"""
    import json, re
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    system_prompt = STORYBOARD_SCRIPT_PROMPT.format(shot_count=req.shot_count)
    # 注入风格和画质约束到分镜头提示词
    style_instruction = STYLE_MAP.get(req.style or "realistic", "")
    quality_instruction = QUALITY_MAP.get(req.quality or "standard", "")
    if style_instruction or quality_instruction:
        system_prompt += f"\n\n所有分镜头的 visual_prompt 必须体现以下画面要求：{style_instruction}"
        if quality_instruction:
            system_prompt += f"。{quality_instruction}"
    if req.model.startswith("glm-4.7"):
        system_prompt += "\n\n重要：请将最终JSON结果放在 <output> 标签中，格式：<output>{...}</output>"

    try:
        data = await _glm_chat(
            model=req.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请将以下故事拆分为{req.shot_count}个分镜头：\n{req.prompt}"},
            ],
            temperature=req.temperature,
            max_tokens=4000,
        )
        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()

        if not content:
            rc = msg.get("reasoning_content", "").strip()
            if rc:
                match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
                content = match.group(1).strip() if match else rc

        if not content:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        # Extract shots using robust multi-format parser
        shots = _extract_shots_from_content(content)
        if not shots:
            logger.debug(f"[GLM] No shots extracted. Raw content: {content[:500]}")
            raise HTTPException(status_code=502, detail=f"无法解析分镜头脚本，GLM 返回格式错误: {content[:200]}")

        # Check for truncation: if finish_reason is "length", we got cut off
        finish_reason = data.get("choices", [{}])[0].get("finish_reason", "")
        if finish_reason == "length":
            logger.debug(f"[GLM] Output truncated (finish_reason=length). Got {len(shots)} shots, expected {req.shot_count}")

        script = {
            "title": "分镜头脚本",
            "shots": shots,
        }

        return {"script": script}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 剧本生成 ====================

SCREENPLAY_PROMPT = """你是一个专业的电影编剧和分镜设计师。根据用户提供的故事梗概，生成一份完整的剧本。

## visual_prompt 编写规则（核心要求）
所有 visual_prompt（shots、scenes、pose/expression/outfit_prompts）是直接喂给AI图片生成器的提示词，必须：
1. 开头描述画面主体（角色外貌、服装、动作、表情）
2. 描述场景背景（环境、建筑、天气、时间）
3. 指定光影效果（光源方向、色温、硬光/柔光）
4. 指定构图方式（景别+角度+构图法则）
5. 描述色调和氛围
6. 使用中文，50-100字
7. 严禁出现"注意"等元描述词，直接描述画面

## 示例 shot visual_prompt
"一位身穿深蓝色风衣的男性站在雨后的城市天台上，右手握着伞，俯瞰灯火通明的街道。背景是现代都市摩天大楼群，霓虹灯在湿润地面反射出斑斓色彩。暖色调路灯与冷色调天空形成冷暖对比，低角度仰拍，电影质感"

## 示例 character pose_prompt
"一位25岁亚洲女性，黑色长发披肩，身穿白色实验室外套，双手抱胸站立。正面全身视角，自然光从左侧照射，面部表情自信从容，简洁纯色背景，锐利对焦，写实风格"

严格按以下JSON格式输出，不要添加任何其他文字：

{{
  "title": "故事标题",
  "logline": "一句话故事概要",
  "characters": [
    {{
      "name": "角色名",
      "role": "主角/配角/反派",
      "description": "角色外貌和性格描述",
      "pose_prompts": [
        "正面全身站姿的详细生图提示词，包含服装、发型、体型、表情",
        "侧面全身站姿的详细生图提示词",
        "3/4角度全身站姿的详细生图提示词"
      ],
      "expression_prompts": [
        "面部特写提示词：角色微笑/开心的表情，光线柔和",
        "面部特写提示词：角色严肃/悲伤的表情，光线戏剧性"
      ],
      "outfit_prompts": [
        "日常服装全身提示词，包含配饰和道具",
        "战斗/正式服装全身提示词，包含配饰和道具"
      ]
    }}
  ],
  "scenes": [
    {{
      "scene_number": 1,
      "location": "场景地点",
      "time_of_day": "时间",
      "description": "场景环境描述（不要包含任何人物）",
      "visual_prompt": "详细的场景生图提示词，包含建筑、植被、天气、光影、氛围。不要出现任何人物。画面比例16:9",
      "mood": "氛围关键词"
    }}
  ],
  "shots": [
    {{
      "shot_number": 1,
      "scene_number": 1,
      "description": "这个镜头发生了什么",
      "visual_prompt": "详细的分镜头生图提示词，包含角色位置、动作、表情、场景背景、光影、构图。画面比例1:1",
      "camera_angle": "镜头角度和景别",
      "dialogue": [{{"character": "角色名", "line": "台词"}}],
      "mood": "氛围",
      "duration": "预估时长秒"
    }}
  ],
  "script_table": [
    {{
      "shot_number": 1,
      "scene_location": "场景地点",
      "description": "动作描述",
      "dialogue_summary": "对话摘要",
      "camera": "镜头",
      "mood": "氛围",
      "duration": "时长"
    }}
  ]
}}

要求：
1. characters 至少2-4个核心角色
2. 每个character的pose_prompts必须3个，expression_prompts必须2个，outfit_prompts必须2个
3. scenes场景提示词严禁出现人物
4. shots数量为{shot_count}个，形成完整叙事
5. 所有visual_prompt使用中文
6. script_table与shots一一对应"""


@router.post("/screenplay")
async def generate_screenplay(
    req: ScreenplayRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """生成完整剧本（含角色/场景/分镜头提示词）"""
    import json, re
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    style_instruction = STYLE_MAP.get(req.style or "realistic", "")
    quality_instruction = QUALITY_MAP.get(req.quality or "hd", "")

    system_prompt = SCREENPLAY_PROMPT.format(shot_count=req.shot_count)
    if style_instruction or quality_instruction:
        system_prompt += f"\n\n所有 visual_prompt 必须体现：{style_instruction}"
        if quality_instruction:
            system_prompt += f"。{quality_instruction}"

    # Seedance 2.0 提示词增强
    from .seedance_constants import build_seedance_hints
    seedance_hints = build_seedance_hints(
        camera_movement=req.camera_movement,
        light_style=req.light_style,
        negative_prompts=req.negative_prompts,
    )
    if seedance_hints:
        system_prompt += "\n\n## Seedance 2.0 提示词增强约束\n" + "\n".join(f"- {h}" for h in seedance_hints)

    if req.model.startswith("glm-4.7"):
        system_prompt += "\n\n重要：请将最终JSON结果放在 <output> 标签中"

    try:
        data = await _glm_chat(
            model=req.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请根据以下故事梗概生成完整剧本：\n{req.premise}"},
            ],
            temperature=req.temperature,
            max_tokens=16000,
        )
        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()
        finish_reason = data.get("choices", [{}])[0].get("finish_reason", "")

        if not content:
            rc = msg.get("reasoning_content", "").strip()
            if rc:
                match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
                content = match.group(1).strip() if match else rc

        if not content:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        # Extract JSON — bracket counting 提取第一个完整的 JSON object
        json_str = None

        # 1) Markdown code block — capture full content, then bracket-count
        m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if m:
            json_str = _find_balanced(m.group(1), '{', '}')

        # 2) <output> tag
        if not json_str:
            m = re.search(r'<output>([\s\S]*?)</output>', content)
            if m:
                json_str = _find_balanced(m.group(1), '{', '}')

        # 3) Raw content fallback
        if not json_str:
            json_str = _find_balanced(content, '{', '}')

        if not json_str:
            raise HTTPException(status_code=502, detail=f"无法解析剧本: {content[:200]}")

        try:
            screenplay = json.loads(json_str)
        except json.JSONDecodeError:
            cleaned = _repair_json(json_str)
            try:
                screenplay = json.loads(cleaned)
            except json.JSONDecodeError as e2:
                pos = e2.pos if hasattr(e2, 'pos') else 0
                logger.debug(f"[GLM] Screenplay JSON repair failed at pos {pos}")
                raise HTTPException(status_code=502, detail=f"剧本 JSON 解析失败: {e2}")

        # Validate and fill defaults
        if finish_reason == "length":
            logger.debug(f"[GLM] Screenplay output truncated! Characters: {len(screenplay.get('characters', []))}, Scenes: {len(screenplay.get('scenes', []))}, Shots: {len(screenplay.get('shots', []))}")
        screenplay.setdefault("title", "未命名故事")
        screenplay.setdefault("logline", "")
        screenplay.setdefault("characters", [])
        screenplay.setdefault("scenes", [])
        screenplay.setdefault("shots", [])
        screenplay.setdefault("script_table", [])

        for idx, char in enumerate(screenplay["characters"]):
            if not isinstance(char, dict): continue
            char.setdefault("name", f"角色{idx+1}")
            char.setdefault("pose_prompts", [])
            char.setdefault("expression_prompts", [])
            char.setdefault("outfit_prompts", [])

        for idx, scene in enumerate(screenplay["scenes"]):
            if not isinstance(scene, dict): continue
            scene.setdefault("scene_number", idx + 1)
            scene.setdefault("visual_prompt", scene.get("description", ""))

        for idx, shot in enumerate(screenplay["shots"]):
            if not isinstance(shot, dict): continue
            shot.setdefault("shot_number", idx + 1)
            shot.setdefault("visual_prompt", shot.get("description", ""))
            shot.setdefault("dialogue", [])

        for idx, entry in enumerate(screenplay["script_table"]):
            if not isinstance(entry, dict): continue
            entry.setdefault("shot_number", idx + 1)

        return {"screenplay": screenplay}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时（剧本生成需要较长时间）")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TVC 专用端点 ====================

TVC_MODE_CONSTRAINTS = {
    "creative": "大胆创意，打破常规构图，追求独特视觉冲击。允许非常规镜头角度和转场方式。",
    "precise": "聚焦产品核心卖点，构图简洁，动作精准。每个镜头必须有明确的产品展示目的。",
    "cinematic": "电影级画面质感，强调光影层次、景深变化、色彩分级。使用专业镜头语言描述。",
    "commercial": "经典TVC结构：吸引→展示→利益→行动。品牌露出自然，情感共鸣强烈。",
}

TVC_SCRIPT_PROMPT = """你是个剧本编辑，擅长将文字写得更有故事性的剧本，并且根据该剧本写出分镜头脚本。

## 任务
根据用户的 TVC 广告创意描述，创作一部完整的广告剧本（3000-5000字），并拆分为 {shot_count} 个分镜头脚本。该脚本包含分镜头脚本的所有要素：人物主角、场景、对白、画面构图、镜头运动、光影氛围、BGM 音乐提示词等。

## 剧本文本要求
1. 总字数 3000-5000 字，不低于 3000 字
2. 具有完整的三幕结构：吸引注意 → 展示冲突/情感 → 解决/品牌揭示
3. 人物对话自然，有情感张力
4. 场景描述画面感强，可直接用于视觉化
5. 为每个镜头提供 BGM 音乐提示词（风格、情绪、乐器）

## 输出 JSON 格式
严格输出以下 JSON，不要添加任何其他文字：

{{
  "tvc_title": "TVC 标题",
  "logline": "一句话故事概要",
  "total_duration": {total_duration},
  "shot_duration": {shot_duration},
  "shot_count": {shot_count},
  "characters": [
    {{
      "name": "角色名",
      "role": "主角/配角/旁白",
      "description": "外貌、性格、服装描述",
      "traits": ["性格特征1", "性格特征2"]
    }}
  ],
  "scenes": [
    {{
      "scene_number": 1,
      "location": "场景地点",
      "time_of_day": "时间（清晨/正午/黄昏/夜晚）",
      "description": "场景环境描述（用于场景设计参考）"
    }}
  ],
  "shots": [
    {{
      "shot_id": 1,
      "timeline": {{
        "start": "00:00",
        "end": "00:05",
        "duration": {shot_duration},
        "transition": "fade_in"
      }},
      "scene_number": 1,
      "scene_description": "这个镜头发生了什么（中文，简短叙述，包含角色动作和情感）",
      "dialogue": [
        {{"character": "角色名", "line": "台词内容"}}
      ],
      "video_prompt": "A young woman in white dress turns slowly, wind gently blows her hem. Soft golden hour lighting, beach at dusk with warm amber glow. Camera slow push-in, cinematic film tone 35mm. Avoid jitter and bent limbs.",
      "start_frame_prompt": "起始帧图片提示词（中文，50字以内：画面主体+光线+构图，描述镜头第一帧）",
      "end_frame_prompt": "结束帧图片提示词（中文，50字以内：画面主体+光线+构图，描述镜头最后一帧）",
      "bgm_mood": "风格,情绪,乐器（如：独立民谣,忧郁,吉他主导）"
    }}
  ],
  "narration": "完整的旁白/画外音文本（如有），或故事线叙述",
  "timeline_summary": {{
    "total_duration": {total_duration},
    "shot_count": {shot_count},
    "shot_duration": {shot_duration},
    "transitions": ["fade_in", "cut", "cut", "dissolve", "cut", "fade_out"]
  }}
}}

## video_prompt 编写规则（核心 — Seedance 2.0 六步公式）
1. 必须使用英文，60-100 词为佳，不超过 150 词
2. 标准公式：[主体动作] + [环境/光线] + [镜头运动] + [风格] + [负面约束]
3. 只写一个主镜头运动（push-in / pull-out / tracking / orbit / aerial / fixed / handheld）
4. 镜头运动和主体运动必须分开描述，不可混淆（如错误："spinning camera around a dancing person"）
5. 用节奏词描述速度（slow / gentle / smooth / gradual），不用技术参数（fps / ISO / 焦距）
6. 光线描述是提升画质最有效的元素（golden hour / rim light / backlit / neon / natural light）
7. 必须包含负面约束："avoid jitter and bent limbs"（人物视频必加）
8. 避免使用模糊形容词（epic / amazing / beautiful），用具体视觉描述替代
9. 描述起始帧到结束帧之间的过渡动作
10. 避免否定描述（no, without），改用 "avoid ..." 格式

## start_frame_prompt / end_frame_prompt 编写规则
1. 使用中文
2. 必须与 video_prompt 视觉一致
3. 起始帧和结束帧之间必须有视觉连续性（同一场景、同一光线、同一色调）
4. 50 字以内
5. 包含：画面主体 + 光线 + 构图

## bgm_mood 编写规则
格式：[风格],[情绪],[乐器]
示例：独立民谣,忧郁,吉他主导
示例：电子合成,欢快,快节奏
示例：管弦乐,史诗,弦乐+铜管

## dialogue 编写规则
1. 每个镜头可以有 0-3 句对白
2. 对白自然、口语化、有情感
3. 旁白用 character: "旁白" 标记

## timeline 编写规则
1. 第一个镜头 transition 用 fade_in，最后一个用 fade_out
2. 中间镜头用 cut 或 dissolve
3. 时间必须连续，无间隔
4. duration 必须等于 {shot_duration}"""


class TvcScriptRequest(BaseModel):
    prompt: str
    shot_count: int = 6
    shot_duration: int = 5
    total_duration: int = 30
    mode: str = "cinematic"
    style_reference: Optional[str] = None
    style: Optional[str] = "realistic"
    model: str = "glm-5.1"
    # Seedance 2.0 提示词增强
    camera_movement: Optional[str] = None
    light_style: Optional[str] = None
    negative_prompts: Optional[list[str]] = None


@router.post("/tvc-script")
async def generate_tvc_script(
    req: TvcScriptRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """TVC 专用脚本生成 — GLM-5.1 thinking 模式"""
    import json, re
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    # 构造 system prompt
    system_prompt = TVC_SCRIPT_PROMPT.format(
        shot_count=req.shot_count,
        shot_duration=req.shot_duration,
        total_duration=req.total_duration,
    )

    # 注入模式约束
    mode_instruction = TVC_MODE_CONSTRAINTS.get(req.mode, TVC_MODE_CONSTRAINTS["cinematic"])
    system_prompt += f"\n\n## 创作模式\n{mode_instruction}"

    # 注入风格
    style_instruction = STYLE_MAP.get(req.style or "realistic", "")
    if style_instruction:
        system_prompt += f"\n\n## 画面风格\n{style_instruction}"

    # 注入产品视觉风格约束（来自 5V-Turbo 分析）
    if req.style_reference:
        system_prompt += f"\n\n## 产品视觉风格约束（必须遵循）\n{req.style_reference}"

    # 注入 Seedance 2.0 提示词增强参数
    from .seedance_constants import build_seedance_hints
    seedance_hints = build_seedance_hints(
        camera_movement=getattr(req, 'camera_movement', None),
        light_style=getattr(req, 'light_style', None),
        negative_prompts=getattr(req, 'negative_prompts', None),
    )
    if seedance_hints:
        system_prompt += "\n\n## Seedance 2.0 提示词增强约束\n" + "\n".join(f"- {h}" for h in seedance_hints)

    # thinking 模型使用 <output> 标签
    is_thinking = req.model.startswith("glm-5")
    if is_thinking:
        system_prompt += "\n\n重要：请将最终 JSON 结果放在 <output> 标签中，格式：<output>{...}</output>"

    # 参数
    api_params = {
        "model": req.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请生成以下TVC广告的结构化脚本：\n{req.prompt}"},
        ],
        "temperature": 1.0 if is_thinking else 0.7,
        "max_tokens": 8192,
    }
    if is_thinking:
        api_params["thinking"] = {"type": "enabled"}

    try:
        data = await _glm_chat(
            model=api_params["model"],
            messages=api_params["messages"],
            temperature=api_params.get("temperature", 0.7),
            max_tokens=api_params.get("max_tokens", 8192),
        )
        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()

        # thinking 模型：content 可能为空，取 reasoning_content
        if not content:
            rc = msg.get("reasoning_content", "").strip()
            if rc:
                match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
                content = match.group(1).strip() if match else rc

        if not content:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        # 提取 JSON
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
            raise HTTPException(status_code=502, detail=f"无法解析 TVC 脚本: {content[:200]}")

        try:
            script = json.loads(json_str)
        except json.JSONDecodeError:
            cleaned = _repair_json(json_str)
            script = json.loads(cleaned)

        # 校验并补全
        script.setdefault("tvc_title", "未命名TVC")
        script.setdefault("logline", "")
        script.setdefault("total_duration", req.total_duration)
        script.setdefault("shot_duration", req.shot_duration)
        script.setdefault("shot_count", req.shot_count)
        script.setdefault("characters", [])
        script.setdefault("scenes", [])
        script.setdefault("shots", [])
        script.setdefault("narration", "")
        script.setdefault("timeline_summary", {})

        for idx, char in enumerate(script.get("characters", [])):
            if not isinstance(char, dict):
                continue
            char.setdefault("name", f"角色{idx+1}")
            char.setdefault("role", "配角")
            char.setdefault("description", "")
            char.setdefault("traits", [])

        for idx, scene in enumerate(script.get("scenes", [])):
            if not isinstance(scene, dict):
                continue
            scene.setdefault("scene_number", idx + 1)
            scene.setdefault("location", "")
            scene.setdefault("time_of_day", "")
            scene.setdefault("description", "")

        for idx, shot in enumerate(script["shots"]):
            if not isinstance(shot, dict):
                continue
            shot.setdefault("shot_id", idx + 1)
            shot.setdefault("scene_number", 1)
            shot.setdefault("timeline", {
                "start": f"{(idx * req.shot_duration) // 60:02d}:{(idx * req.shot_duration) % 60:02d}",
                "end": f"{((idx + 1) * req.shot_duration) // 60:02d}:{((idx + 1) * req.shot_duration) % 60:02d}",
                "duration": req.shot_duration,
                "transition": "fade_in" if idx == 0 else ("fade_out" if idx == len(script["shots"]) - 1 else "cut"),
            })
            shot.setdefault("scene_description", "")
            shot.setdefault("dialogue", [])
            shot.setdefault("video_prompt", "")
            shot.setdefault("start_frame_prompt", "")
            shot.setdefault("end_frame_prompt", "")
            shot.setdefault("bgm_mood", "")

        return {"script": script}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 产品参考图分析 ====================

PRODUCT_REFERENCE_PROMPT = """你是TVC广告视觉风格分析专家。
分析用户上传的产品参考图，提取视觉风格信息用于TVC广告脚本生成。

输出严格JSON：
{
  "product_name": "产品名称",
  "visual_style": "极简奢华/清新自然/科技未来/复古经典",
  "color_palette": ["主色调描述", "辅色调描述"],
  "mood": "温暖/冷峻/活力/优雅/神秘",
  "lighting_style": "柔光箱/硬光/自然光/霓虹光效",
  "composition": "居中对称/三分法/对角线/引导线",
  "key_elements": ["核心视觉元素1", "元素2", "元素3"],
  "tvc_style_reference": "一段完整的风格约束文本（200字内），包含色调、光影、构图、情绪、风格关键词，用于约束下游TVC脚本的视觉风格一致性"
}

只输出JSON。"""


class ProductReferenceRequest(BaseModel):
    image_url: str
    intent: Optional[str] = "tvc"
    model: str = "glm-5v-turbo"


@router.post("/product-reference")
async def analyze_product_reference(
    req: ProductReferenceRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """GLM-5V-Turbo 产品参考图分析"""
    import json, re
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    api_params = {
        "model": req.model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": req.image_url}},
                    {"type": "text", "text": PRODUCT_REFERENCE_PROMPT},
                ],
            },
        ],
        "thinking": {"type": "enabled"},
        "max_tokens": 2048,
    }

    try:
        data = await _glm_chat(
            model=api_params["model"],
            messages=api_params["messages"],
            temperature=api_params.get("temperature", 0.7),
            max_tokens=api_params.get("max_tokens", 2048),
        )
        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()

        if not content:
            rc = msg.get("reasoning_content", "").strip()
            if rc:
                match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
                content = match.group(1).strip() if match else rc

        if not content:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        # 提取 JSON
        json_str = _find_balanced(content, '{', '}')
        if not json_str:
            m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
            if m:
                json_str = _find_balanced(m.group(1), '{', '}')

        if not json_str:
            raise HTTPException(status_code=502, detail=f"无法解析产品分析结果: {content[:200]}")

        try:
            analysis = json.loads(json_str)
        except json.JSONDecodeError:
            cleaned = _repair_json(json_str)
            analysis = json.loads(cleaned)

        analysis.setdefault("product_name", "未知产品")
        analysis.setdefault("visual_style", "")
        analysis.setdefault("color_palette", [])
        analysis.setdefault("mood", "")
        analysis.setdefault("lighting_style", "")
        analysis.setdefault("composition", "")
        analysis.setdefault("key_elements", [])
        analysis.setdefault("tvc_style_reference", "")

        return {"analysis": analysis}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== AI 视频剪辑 Agent ====================

VIDEO_AGENT_SYSTEM_PROMPT = """你是一个专业的 AI 视频剪辑助手。用户会告诉你他们想对视频做什么操作，你需要解析他们的意图并返回结构化的 JSON 指令。

当前项目有 {clip_count} 个镜头视频{bgm_info}。

支持的操作：
1. concat — 拼接视频片段。参数: clips(片段索引数组, 如[0,1,2])
2. compare — 前后对比分屏。参数: original_index, result_index, layout(side-by-side/top-bottom/pip)
3. subtitle — 添加字幕。参数: text(字幕文本), start(秒), end(秒)
4. bgm — 更换/调整BGM。参数: volume(0-1), action(set/adjust)
5. compose — 完整合成管线。参数: transition(fade/dissolve/cut/wipe), resolution(720p/1080p/4k), enable_bgm(bool)

你必须返回如下 JSON 格式：
{"message": "对用户说的话", "command": {"action": "操作名", "params": {参数}, "description": "操作描述"}}

如果用户只是闲聊或不涉及视频操作，只返回 message，不包含 command。
只输出 JSON，不要输出其他内容。"""


class VideoAgentRequest(BaseModel):
    messages: list[dict]
    context: dict


@router.post("/tvc-video-agent")
async def video_agent_chat(
    req: VideoAgentRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """AI 视频剪辑 Agent — GLM-4.5-air 解析用户意图返回结构化指令"""
    import json
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    clip_count = len(req.context.get("clips", []))
    has_bgm = bool(req.context.get("bgmUrl"))
    bgm_info = " + BGM" if has_bgm else ""

    system_msg = VIDEO_AGENT_SYSTEM_PROMPT.format(clip_count=clip_count, bgm_info=bgm_info)

    messages = [{"role": "system", "content": system_msg}] + req.messages

    api_url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "glm-4.5-air",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]

        # 尝试解析为 JSON
        repaired = _repair_json(content)
        parsed = _find_balanced(repaired, "{", "}")

        if parsed:
            result = json.loads(parsed)
            return {
                "message": result.get("message", ""),
                "command": result.get("command"),
            }

        return {"message": content, "command": None}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Agent 响应超时")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent 错误: {str(e)}")


@router.post("/tvc-video-agent/stream")
async def video_agent_stream(
    req: VideoAgentRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """AI 视频剪辑 Agent — SSE 流式响应"""
    import json
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    clip_count = len(req.context.get("clips", []))
    has_bgm = bool(req.context.get("bgmUrl"))
    bgm_info = " + BGM" if has_bgm else ""

    system_msg = VIDEO_AGENT_SYSTEM_PROMPT.format(clip_count=clip_count, bgm_info=bgm_info)
    messages = [{"role": "system", "content": system_msg}] + req.messages

    api_url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "glm-4.5-air",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512,
        "stream": True,
    }

    async def event_stream():
        try:
            async with httpx.AsyncClient(timeout=60) as http:
                async with http.stream("POST", api_url, headers=headers, json=payload) as resp:
                    resp.raise_for_status()

                    buffer = ""
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break

                        try:
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                buffer += content
                                yield f"data: {json.dumps({'type': 'text', 'content': content})}\n\n"
                        except json.JSONDecodeError:
                            continue

                    # 流结束后解析完整 JSON
                    repaired = _repair_json(buffer)
                    parsed = _find_balanced(repaired, "{", "}")
                    if parsed:
                        try:
                            result = json.loads(parsed)
                            command = result.get("command")
                            yield f"data: {json.dumps({'type': 'done', 'message': result.get('message', ''), 'command': command})}\n\n"
                        except json.JSONDecodeError:
                            yield f"data: {json.dumps({'type': 'done', 'message': buffer, 'command': None})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'done', 'message': buffer, 'command': None})}\n\n"

                    yield "data: [DONE]\n\n"

        except httpx.TimeoutException:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Agent 响应超时'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
