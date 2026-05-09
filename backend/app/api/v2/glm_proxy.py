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
                    "max_tokens": 2000,
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

        # Extract JSON from response
        # 1. Try ```json ... ``` code block first
        code_block = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', content)
        json_str = code_block.group(1) if code_block else None

        # 2. Try <output>...</output>
        if not json_str:
            output_match = re.search(r'<output>\s*(\{[\s\S]*?\})\s*</output>', content)
            json_str = output_match.group(1) if output_match else None

        # 3. Greedy brace match (fallback)
        if not json_str:
            brace_match = re.search(r'\{[\s\S]*\}', content)
            json_str = brace_match.group() if brace_match else None

        if not json_str:
            raise HTTPException(status_code=502, detail=f"无法解析分镜头脚本，GLM 返回格式错误: {content[:200]}")

        # Attempt JSON parse with auto-repair for common GLM mistakes
        try:
            script = json.loads(json_str)
        except json.JSONDecodeError:
            # Strip trailing commas before ] or }
            cleaned = re.sub(r',\s*([}\]])', r'\1', json_str)
            # Remove JS-style comments
            cleaned = re.sub(r'//.*?\n', '\n', cleaned)
            # Remove control characters
            cleaned = re.sub(r'[\x00-\x1f]', ' ', cleaned)
            try:
                script = json.loads(cleaned)
            except json.JSONDecodeError as e2:
                raise HTTPException(status_code=502, detail=f"JSON 解析失败: {str(e2)}")

        # Validate structure
        if "shots" not in script or not isinstance(script["shots"], list):
            raise HTTPException(status_code=502, detail="分镜头脚本缺少 shots 数组")

        for shot in script["shots"]:
            shot.setdefault("shot_number", script["shots"].index(shot) + 1)
            shot.setdefault("scene_description", "")
            shot.setdefault("visual_prompt", "")
            shot.setdefault("camera_angle", "")
            shot.setdefault("mood", "")

        return {"script": script}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
