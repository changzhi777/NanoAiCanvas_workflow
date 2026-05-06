"""
Skills API - v2 Routes

Provides endpoints for AI skill-based image generation:
- POST /chat - Analyze user intent and recommend templates
- GET /templates - List all available templates
- POST /generate - Enqueue async image generation task (Redis queue)
- GET /tasks/{task_id} - Get task status (from Redis store)
- GET /queue/status - Get queue status
- POST /tasks/{task_id}/cancel - Cancel a queued task
"""

import os
import httpx
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import Optional

from app.config import get_settings
from app.services.skills import (
    get_skills_loader,
    SkillChatRequest,
    SkillChatResponse,
    TemplatesListResponse,
    GenerateRequest,
    GenerateResponse,
    TaskStatus,
)
from app.services.skills.gpt_image_2 import PromptBuilder
from app.services.task_queue import TaskQueueManager
from app.services.skills_worker import WorkerManager

router = APIRouter(prefix="/api/v2/skills", tags=["skills"])

settings = get_settings()


@router.post("/chat", response_model=SkillChatResponse)
async def chat_analyze_template(request: SkillChatRequest):
    """
    Analyze user message and recommend suitable templates.

    Uses LLM to understand user intent and suggest the most appropriate
    template categories and specific templates.
    """
    loader = get_skills_loader()
    skill = loader.get_skill(request.skill_id)

    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{request.skill_id}' not found")

    all_templates = skill.templates
    categories = skill.templates_by_category

    category_summary = []
    for cat_id, cat_templates in categories.items():
        cat_name = cat_templates[0].category_name if cat_templates else cat_id
        template_names = [t.name for t in cat_templates]
        category_summary.append(f"- {cat_name}: {', '.join(template_names)}")

    system_prompt = """You are an expert image generation consultant. Analyze the user's request and recommend the most suitable templates from the available options.

Available template categories:
{categories}

Your task:
1. Understand what kind of image the user wants to create
2. Recommend 2-4 specific templates that best match the request
3. For each template, provide a confidence score (0-1) and brief reasoning
4. If more information is needed, ask a specific follow-up question

Respond in JSON format:
{{
  "recommended_templates": [
    {{"template_id": "...", "confidence": 0.9, "reasoning": "..."}},
    ...
  ],
  "suggested_category": "...",
  "needs_more_info": true/false,
  "follow_up_question": "..." (if needs_more_info is true)
}}"""

    user_message = f"User wants to create: {request.message}"

    api_key = settings.SKILLS_API_KEY or os.environ.get("OPENAI_API_KEY") or settings.OPENAI_API_KEY

    if not api_key:
        return _fallback_template_recommendation(request.message, all_templates)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.OPENAI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt.format(categories="\n".join(category_summary))},
                        {"role": "user", "content": user_message}
                    ],
                    "response_format": {"type": "json_object"}
                }
            )

            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"LLM API error: {response.text}")

            result = response.json()
            content = result["choices"][0]["message"]["content"]

            import json
            parsed = json.loads(content)

            valid_template_ids = {t.id for t in all_templates}
            recommended = []
            for rec in parsed.get("recommended_templates", []):
                if rec.get("template_id") in valid_template_ids:
                    recommended.append(rec)

            return SkillChatResponse(
                recommended_templates=recommended,
                suggested_category=parsed.get("suggested_category"),
                reasoning=parsed.get("reasoning", ""),
                needs_more_info=parsed.get("needs_more_info", False),
                follow_up_question=parsed.get("follow_up_question")
            )

    except Exception as e:
        return _fallback_template_recommendation(request.message, all_templates)


def _fallback_template_recommendation(message: str, all_templates):
    """Simple keyword-based template matching as fallback"""
    message_lower = message.lower()

    category_keywords = {
        "ui-mockups": ["ui", "界面", "直播", "社交", "product card", "mockup"],
        "product-visuals": ["产品", "商品", "爆炸", "白底", "product"],
        "maps": ["地图", "旅行", "路线", "美食", "map"],
        "storyboards": ["分镜", "漫画", "故事板", "storyboard", "格漫"],
        "portraits": ["角色", "人物", "肖像", "character", "portrait"],
        "poster": ["海报", "poster", "品牌"],
        "branding": ["品牌", "logo", "identity", "包装"],
        "technical": ["架构", "流程图", "技术", "technical", "diagram"]
    }

    matched_cats = []
    for cat_id, keywords in category_keywords.items():
        if any(kw in message_lower for kw in keywords):
            matched_cats.append(cat_id)

    recommended = []
    for template in all_templates:
        if template.category in matched_cats:
            confidence = 0.8
        else:
            if any(kw in template.name.lower() or kw in template.description.lower()
                   for kw in message_lower.split()):
                confidence = 0.6
            else:
                continue

        recommended.append({
            "template_id": template.id,
            "confidence": confidence,
            "reasoning": f"匹配关键词: {template.name}"
        })

    recommended.sort(key=lambda x: x["confidence"], reverse=True)
    recommended = recommended[:4]

    return SkillChatResponse(
        recommended_templates=recommended,
        suggested_category=matched_cats[0] if matched_cats else None,
        reasoning="基于关键词匹配推荐",
        needs_more_info=False
    )


@router.get("/templates", response_model=TemplatesListResponse)
async def list_templates(skill_id: str = "gpt_image_2"):
    """Get all available templates grouped by category"""
    loader = get_skills_loader()
    templates = loader.get_templates(skill_id)

    if not templates:
        raise HTTPException(status_code=404, detail=f"No templates found for skill '{skill_id}'")

    return templates


@router.get("/templates/categories")
async def list_categories(skill_id: str = "gpt_image_2"):
    """Get all template categories"""
    loader = get_skills_loader()
    skill = loader.get_skill(skill_id)

    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")

    categories = []
    for cat_id, cat_templates in skill.templates_by_category.items():
        categories.append({
            "id": cat_id,
            "name": cat_templates[0].category_name if cat_templates else cat_id,
            "template_count": len(cat_templates)
        })

    return {"categories": categories}


@router.post("/generate", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest):
    """
    Enqueue an async image generation task.

    Task is added to Redis queue and processed by SkillsWorker.
    Progress is published via Redis Pub/Sub and available via WebSocket.
    """
    loader = get_skills_loader()
    skill = loader.get_skill(request.skill_id)

    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{request.skill_id}' not found")

    # __direct__ 模式：跳过模板验证，直接使用 form_data 中的 prompt
    if request.template_id != "__direct__":
        template = skill.get_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template '{request.template_id}' not found")

    # 入队
    queue_mgr = TaskQueueManager()
    queue = await queue_mgr.get_queue(request.skill_id)

    task_id = await queue.enqueue({
        "template_id": request.template_id,
        "form_data": request.form_data,
        "skill_id": request.skill_id,
        "size": request.size,
        "quality": request.quality,
    })

    return GenerateResponse(
        task_id=task_id,
        status="queued",
        message="任务已加入队列"
    )


@router.get("/tasks/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    """
    Get task status from Redis store.

    Task progress is updated by SkillsWorker at each step.
    """
    queue_mgr = TaskQueueManager()
    task = await queue_mgr.get_task_by_id(task_id)

    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    status = task.get("status", "unknown")
    progress = task.get("progress", 0)

    result = None
    error = None

    if status == "completed" and task.get("result"):
        result = task["result"]
    elif status == "failed":
        error = task.get("error", "Unknown error")

    return TaskStatus(
        task_id=task_id,
        status=status,
        progress=progress,
        result=result,
        error=error,
    )


@router.get("/queue/status")
async def get_queue_status():
    """Get all queue status and worker info"""
    worker_mgr = WorkerManager()
    worker_status = await worker_mgr.get_status()
    queue_mgr = TaskQueueManager()
    queue_info = await queue_mgr.get_all_queue_info()

    return {
        "workers": worker_status,
        "queues": queue_info,
    }


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a queued task"""
    queue_mgr = TaskQueueManager()

    task = await queue_mgr.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    cancelled = await queue_mgr.cancel_task_by_id(task_id)
    if cancelled:
        return {"message": "任务已取消", "task_id": task_id}
    return {"message": "任务无法取消（已开始执行或已完成）", "task_id": task_id}
