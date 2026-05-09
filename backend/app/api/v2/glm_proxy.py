"""
GLM API 代理路由 - 提示词优化
前端通过此接口调用 GLM，API Key 安全存储在后端
支持模型：glm-4.5-air, glm-4-flash, glm-4, glm-4.7-flash
"""

import httpx
from fastapi import APIRouter, HTTPException, Depends
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


def _extract_shots_from_content(content: str) -> list:
    """Extract shots from GLM output, handling multiple formats:
    1. {"title":..., "shots":[...]}  (standard)
    2. [{"shot_number":1, ...}, ...]  (bare array)
    3. Truncated JSON with incomplete shots
    """
    import json, re

    # Try extracting JSON blocks in order of specificity
    json_str = None

    # 1. Code block with object
    m = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
    if m:
        json_str = m.group(1)
    else:
        # 2. Code block with array
        m = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', content)
        if m:
            json_str = m.group(1)

    # 3. Bare <output> tag with object
    if not json_str:
        m = re.search(r'<output>\s*(\{[\s\S]*?\})\s*</output>', content)
        if m:
            json_str = m.group(1)

    # 4. Bare <output> tag with array
    if not json_str:
        m = re.search(r'<output>\s*(\[[\s\S]*?\])\s*</output>', content)
        if m:
            json_str = m.group(1)

    # 5. Greedy object match
    if not json_str:
        m = re.search(r'\{[\s\S]*\}', content)
        if m:
            json_str = m.group()

    # 6. Greedy array match (GLM sometimes returns bare array)
    if not json_str:
        m = re.search(r'\[[\s\S]*\]', content)
        if m:
            json_str = m.group()

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
    style: Optional[str] = "realistic"
    quality: Optional[str] = "hd"
    model: str = "glm-4.5-air"
    temperature: float = 0.7


STYLE_MAP = {
    "realistic": "写实风格，真实照片级，电影级光影",
    "anime": "日系动画风格，赛璐璐上色，鲜明色彩",
    "comic": "美式漫画风格，粗犷线条，动态构图",
    "watercolor": "水彩画风格，柔和晕染，轻盈通透",
    "oil_painting": "油画风格，厚涂质感，丰富肌理，经典艺术",
    "chinese": "中国水墨画风格，留白意境，淡雅笔触",
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

STORYBOARD_SCRIPT_PROMPT = """你是一个专业的电影分镜头脚本编剧。根据用户提供的故事描述，将其拆分为{shot_count}个连续的分镜头，形成一个完整的故事板。

要求：
1. 每个分镜头必须包含：场景描述、图片生成提示词、镜头角度、氛围
2. 图片生成提示词要详细具体，包含角色外貌、动作、表情、服装、场景细节、光影、构图
3. 所有分镜头必须形成连续叙事，前后衔接自然
4. 镜头角度多样化：特写、中景、全景、俯拍、仰拍等
5. 提示词使用中文
6. 严格按以下JSON格式输出，不要添加任何其他文字：

{{
  "title": "故事标题",
  "shots": [
    {{
      "shot_number": 1,
      "scene_description": "这个镜头发生了什么，角色的动作和情感",
      "visual_prompt": "详细的图片生成提示词，包含角色、场景、光影、构图、色调",
      "camera_angle": "镜头角度和景别",
      "mood": "氛围和情绪"
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
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.GLM_API_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.GLM_API_KEY}",
                },
                json={
                    "model": req.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": req.temperature,
                    "max_tokens": 500,
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"GLM API 错误: {resp.text}")

        data = resp.json()
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
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{settings.GLM_API_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.GLM_API_KEY}",
                },
                json={
                    "model": req.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"请将以下故事拆分为{req.shot_count}个分镜头：\n{req.prompt}"},
                    ],
                    "temperature": req.temperature,
                    "max_tokens": 4000,
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"GLM API 错误: {resp.text}")

        data = resp.json()
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
            print(f"[GLM] No shots extracted. Raw content: {content[:500]}")
            raise HTTPException(status_code=502, detail=f"无法解析分镜头脚本，GLM 返回格式错误: {content[:200]}")

        # Check for truncation: if finish_reason is "length", we got cut off
        finish_reason = data.get("choices", [{}])[0].get("finish_reason", "")
        if finish_reason == "length":
            print(f"[GLM] Output truncated (finish_reason=length). Got {len(shots)} shots, expected {req.shot_count}")

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

SCREENPLAY_PROMPT = """你是一个专业的电影编剧和分镜设计师。根据用户提供的故事梗概，生成一份完整的剧本，包含以下所有内容。

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

    if req.model.startswith("glm-4.7"):
        system_prompt += "\n\n重要：请将最终JSON结果放在 <output> 标签中"

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.GLM_API_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.GLM_API_KEY}",
                },
                json={
                    "model": req.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"请根据以下故事梗概生成完整剧本：\n{req.premise}"},
                    ],
                    "temperature": req.temperature,
                    "max_tokens": 8000,
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"GLM API 错误: {resp.text}")

        data = resp.json()
        msg = data.get("choices", [{}])[0].get("message", {})
        content = msg.get("content", "").strip()

        if not content:
            rc = msg.get("reasoning_content", "").strip()
            if rc:
                match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
                content = match.group(1).strip() if match else rc

        if not content:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        # Extract JSON
        json_str = None
        for pattern in [
            r'```(?:json)?\s*(\{[\s\S]*?\})\s*```',
            r'<output>\s*(\{[\s\S]*?\})\s*</output>',
            r'\{[\s\S]*\}',
        ]:
            m = re.search(pattern, content)
            if m:
                json_str = m.group(1) if '```' in pattern or '<output>' in pattern else m.group()
                break

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
                print(f"[GLM] Screenplay JSON repair failed at pos {pos}")
                raise HTTPException(status_code=502, detail=f"剧本 JSON 解析失败: {e2}")

        # Validate and fill defaults
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
