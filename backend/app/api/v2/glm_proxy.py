"""
GLM API 代理路由 - 提示词优化
前端通过此接口调用 GLM，API Key 安全存储在后端
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


SYSTEM_PROMPTS = {
    "storyboard": "你是一个专业的故事板分镜提示词优化专家。根据用户提供的故事描述、场景设定等信息，生成高质量的分镜图片提示词。优化规则：1.保留用户原始意图和核心故事内容 2.添加详细画面描述（角色动作、表情、构图）3.指定光影效果和氛围 4.描述镜头语言 5.明确画面风格和色调 6.使用中文输出 7.只输出优化后的提示词，不要添加解释或前缀",
    "character": "你是一个专业的角色设计提示词优化专家。根据用户的角色描述，生成高质量的AI图片生成提示词。优化规则：1.详细描述角色的外貌、服装、表情和姿态 2.指定光影效果 3.明确画面构图和视角 4.指定画风 5.使用中文输出 6.只输出优化后的提示词，不要添加解释或前缀",
    "scene": "你是一个专业的场景设计提示词优化专家。根据用户的场景描述，生成高质量的AI图片生成提示词。优化规则：1.详细描述场景的空间布局、建筑、自然环境 2.指定光影和氛围 3.明确镜头语言和透视 4.指定画风和色调 5.使用中文输出 6.只输出优化后的提示词，不要添加解释或前缀",
    "custom": "你是一个专业的AI图片提示词优化专家。根据用户的描述，生成高质量的图片生成提示词。规则：1.保留用户原始意图 2.添加画面细节描述 3.使用中文输出 4.只输出优化后的提示词",
}


@router.post("/optimize")
async def optimize_prompt(
    req: OptimizeRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    settings = get_settings()
    if not settings.GLM_API_KEY:
        raise HTTPException(status_code=500, detail="GLM API Key 未配置")

    system_prompt = SYSTEM_PROMPTS.get(req.system_prompt_template, SYSTEM_PROMPTS["storyboard"])

    try:
        async with httpx.AsyncClient(timeout=30) as client:
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
                        {"role": "user", "content": f"请优化以下描述，生成图片提示词：\n{req.prompt}"},
                    ],
                    "temperature": req.temperature,
                    "max_tokens": 500,
                },
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"GLM API 错误: {resp.text}")

        data = resp.json()
        optimized = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not optimized:
            raise HTTPException(status_code=502, detail="GLM 返回为空")

        return {"optimized_prompt": optimized}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GLM API 超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
