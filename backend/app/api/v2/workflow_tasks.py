"""
TVC 工作流任务 API
- POST /api/v2/tvc-tasks/submit   提交任务
- GET  /api/v2/tvc-tasks/{id}     查询状态
- POST /api/v2/tvc-tasks/{id}/cancel  取消任务
- GET  /api/v2/tvc-tasks/{id}/progress SSE 实时进度流
"""

import json
import asyncio
import uuid
import re
import httpx
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

from app.api.auth import get_current_user_optional
from app.models import User
from app.services import workflow_executor
from app.config import get_settings

router = APIRouter(prefix="/api/v2/tvc-tasks", tags=["tvc-tasks"])


class SubmitRequest(BaseModel):
    workflow_id: str
    prompt: str
    shot_count: int = 6
    shot_duration: int = 5
    total_duration: int = 30
    mode: str = "cinematic"
    style: str = "realistic"
    optimize_mode: str = "tvc_deep"
    execution_mode: str = "auto"
    image_model: str = "jimeng"      # "gpt-image-2" | "jimeng" | "minimax"
    video_model: str = "jimeng"      # "seedance" | "minimax" | "glm" | "jimeng"
    style_reference: Optional[str] = None
    reference_image: Optional[str] = None


class NodeDef(BaseModel):
    id: str
    label: str
    type: str


@router.post("/submit")
async def submit_task(
    req: SubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """提交 TVC 工作流任务"""
    # 积分预检
    if current_user:
        from app.services.points_service import check_balance as _check_balance, node_type_to_model_type, resolve_price
        from app.database import async_session_maker
        from app.api.points import get_or_create_user_account

        try:
            async with async_session_maker() as db:
                account = await get_or_create_user_account(db, current_user.id)
                text_model = node_type_to_model_type("script_generator")
                text_price = await resolve_price(db, text_model)
                image_model_type = node_type_to_model_type("storyboard_generator")
                image_price = await resolve_price(db, image_model_type)
                video_model_type = node_type_to_model_type("storyboard_video")
                video_price = await resolve_price(db, video_model_type)
                bgm_model = node_type_to_model_type("background_music")
                bgm_price = await resolve_price(db, bgm_model)

                total = text_price * 3 + image_price * req.shot_count * 2 + video_price * req.shot_count + bgm_price
                if account.balance < total:
                    raise HTTPException(
                        status_code=402,
                        detail=f"积分不足，需要 {total}，当前余额 {account.balance}",
                        headers={"X-Insufficient-Balance": "true"},
                    )
        except HTTPException:
            raise
        except Exception:
            pass  # 积分服务不可用时放行

    task_id = f"tvc_{uuid.uuid4().hex[:12]}"

    # 构建节点执行列表
    nodes = [
        {
            "id": "step-script",
            "label": "剧本生成",
            "type": "script",
            "status": "pending",
            "progress": 0,
            "subtasks": [],
        },
        {
            "id": "step-optimize",
            "label": "提示词优化",
            "type": "optimize",
            "status": "pending",
            "progress": 0,
            "subtasks": [],
        },
        {
            "id": "step-breakdown",
            "label": "分镜头脚本",
            "type": "breakdown",
            "status": "pending",
            "progress": 0,
            "subtasks": [],
        },
        {
            "id": "step-images",
            "label": "生图",
            "type": "images",
            "status": "pending",
            "progress": 0,
            "subtasks": [
                {
                    "id": f"shot-{i+1}-start",
                    "label": f"镜头 {i+1}/{req.shot_count}: 起始帧",
                    "status": "pending",
                    "progress": 0,
                }
                for i in range(req.shot_count)
            ] + [
                {
                    "id": f"shot-{i+1}-end",
                    "label": f"镜头 {i+1}/{req.shot_count}: 结束帧",
                    "status": "pending",
                    "progress": 0,
                }
                for i in range(req.shot_count)
            ],
        },
        {
            "id": "step-video",
            "label": "参考图生视频",
            "type": "video",
            "status": "pending",
            "progress": 0,
            "subtasks": [
                {
                    "id": f"shot-{i+1}-video",
                    "label": f"镜头 {i+1}/{req.shot_count}: 视频",
                    "status": "pending",
                    "progress": 0,
                }
                for i in range(req.shot_count)
            ] + [
                {
                    "id": "bgm",
                    "label": "BGM 生成",
                    "status": "pending",
                    "progress": 0,
                }
            ],
        },
    ]

    state = await workflow_executor.create_task(task_id, req.workflow_id, nodes)

    # 异步启动执行（不阻塞响应）
    asyncio.create_task(_execute_tvc(task_id, req))

    return {"task_id": task_id, "status": "submitted"}


@router.get("/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    state = await workflow_executor.load_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    return state


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    """取消任务"""
    state = await workflow_executor.load_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    if state["status"] not in ("submitted", "running"):
        raise HTTPException(status_code=400, detail="任务已完成，无法取消")
    await workflow_executor.complete_task(task_id, "cancelled")
    return {"task_id": task_id, "status": "cancelled"}


@router.get("/{task_id}/progress")
async def stream_progress(task_id: str):
    """SSE 实时进度流"""
    pubsub = workflow_executor.redis_client.pubsub()
    channel = workflow_executor._channel(task_id)
    await pubsub.subscribe(channel)

    async def event_generator():
        try:
            # 先发送当前状态
            state = await workflow_executor.load_task(task_id)
            if state:
                yield f"data: {json.dumps(state, ensure_ascii=False)}\n\n"

            # 监听更新
            last_ping = asyncio.get_event_loop().time()
            while True:
                message = await pubsub.get_message(timeout=30)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    yield f"data: {data}\n\n"

                    # 检查是否完成
                    try:
                        parsed = json.loads(data)
                        if parsed.get("status") in ("completed", "failed", "cancelled"):
                            break
                    except json.JSONDecodeError:
                        pass

                # 心跳保活（每15秒发一次 ping）
                now = asyncio.get_event_loop().time()
                if now - last_ping >= 15:
                    yield ": ping\n\n"
                    last_ping = now

                await asyncio.sleep(0.1)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ==================== 异步执行引擎 ====================

async def _execute_tvc(task_id: str, req: SubmitRequest):
    """线性执行 5 步 TVC 流程"""

    settings = get_settings()

    try:
        state = await workflow_executor.load_task(task_id)
        state["status"] = "running"
        await workflow_executor._save(task_id, state)
        await workflow_executor._publish(task_id, state)

        # Step 1: 剧本生成
        await workflow_executor.update_node(task_id, 0, {"status": "running", "progress": 0})
        script_result = await _call_glm_tvc_script(req, settings)
        await workflow_executor.update_node(task_id, 0, {
            "status": "success", "progress": 100, "result": script_result,
        })

        # Step 2: 提示词优化
        await workflow_executor.update_node(task_id, 1, {"status": "running", "progress": 0})
        optimized = await _optimize_prompts(script_result, req.mode, req, settings)
        await workflow_executor.update_node(task_id, 1, {
            "status": "success", "progress": 100, "result": optimized,
        })

        # Step 3: 分镜头脚本
        await workflow_executor.update_node(task_id, 2, {"status": "running", "progress": 0})
        breakdown = _breakdown_shots(optimized, req.shot_count, req.shot_duration)
        await workflow_executor.update_node(task_id, 2, {
            "status": "success", "progress": 100, "result": breakdown,
        })

        # Step 4: 生图
        await workflow_executor.update_node(task_id, 3, {"status": "running", "progress": 0})
        await _generate_images(task_id, 3, breakdown, req, settings)

        # Step 5: 参考图生视频（线性调度）
        await workflow_executor.update_node(task_id, 4, {"status": "running", "progress": 0})
        await _generate_videos(task_id, 4, breakdown, req, settings)

        await workflow_executor.complete_task(task_id, "completed")

    except Exception as e:
        await workflow_executor.fail_task(task_id, str(e))


async def _call_glm_tvc_script(req: SubmitRequest, settings) -> dict:
    """调用 GLM TVC 脚本生成端点"""

    from app.api.v2.glm_proxy import TVC_SCRIPT_PROMPT, TVC_MODE_CONSTRAINTS, STYLE_MAP

    mode = TVC_MODE_CONSTRAINTS.get(req.mode, TVC_MODE_CONSTRAINTS["cinematic"])
    system_prompt = TVC_SCRIPT_PROMPT.format(
        shot_count=req.shot_count,
        shot_duration=req.shot_duration,
        total_duration=req.total_duration,
    )
    system_prompt += f"\n\n## 创作模式\n{mode}"

    style_instruction = STYLE_MAP.get(req.style, "")
    if style_instruction:
        system_prompt += f"\n\n## 画面风格\n{style_instruction}"

    if req.style_reference:
        system_prompt += f"\n\n## 产品视觉风格约束（必须遵循）\n{req.style_reference}"

    is_thinking = req.optimize_mode in ("tvc_deep", "tvc_vision")
    if is_thinking:
        system_prompt += "\n\n重要：请将最终 JSON 结果放在 <output> 标签中"

    model_map = {"tvc_deep": "glm-5.1", "tvc_fast": "glm-4.5-air", "tvc_vision": "glm-5v-turbo"}
    model = model_map.get(req.optimize_mode, "glm-5.1")

    api_params = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请生成以下TVC广告的结构化脚本：\n{req.prompt}"},
        ],
        "temperature": 1.0 if is_thinking else 0.7,
        "max_tokens": 8192,
    }
    if is_thinking:
        api_params["thinking"] = {"type": "enabled"}

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(
            f"{settings.GLM_API_BASE_URL}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.GLM_API_KEY}",
            },
            json=api_params,
        )

    if resp.status_code != 200:
        raise Exception(f"GLM API error: {resp.text}")

    data = resp.json()
    msg = data.get("choices", [{}])[0].get("message", {})
    content = msg.get("content", "").strip()
    if not content:
        rc = msg.get("reasoning_content", "").strip()
        if rc:
            match = re.search(r"<output>(.*?)</output>", rc, re.DOTALL)
            content = match.group(1).strip() if match else rc

    return {"raw_content": content}


async def _optimize_prompts(script_result: dict, mode: str, req: SubmitRequest, settings) -> dict:
    """提示词优化：调用 GLM 优化脚本为结构化分镜提示词"""
    raw = script_result.get("raw_content", "")

    system_prompt = f"""你是 TVC 广告分镜提示词专家。根据以下 TVC 脚本，为每个镜头生成：
1. start_frame_prompt: 起始帧画面描述（英文，用于图片生成，50-80词）
2. end_frame_prompt: 结束帧画面描述（英文，用于图片生成，50-80词）
3. scene_description: 镜头场景中文概述（20字以内）
4. visual_prompt: 视频动态描述（英文，用于视频生成提示词，30-50词）

风格：{req.style}，模式：{mode}

严格返回 JSON 数组，每个元素对应一个镜头：
[{{"start_frame_prompt": "...", "end_frame_prompt": "...", "scene_description": "...", "visual_prompt": "..."}}]

只返回 JSON，不要其他内容。"""

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.GLM_API_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {settings.GLM_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "glm-4.5-air",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": raw},
                ],
                "temperature": 0.7,
                "max_tokens": 4096,
            },
        )

    if resp.status_code != 200:
        return {"shots": [], "error": f"GLM optimize error: {resp.status_code}"}

    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    # 提取 JSON
    json_match = re.search(r'\[.*\]', content, re.DOTALL)
    if not json_match:
        return {"shots": [], "error": "No JSON array in optimize response"}

    try:
        shots = json.loads(json_match.group())
        return {"shots": shots}
    except json.JSONDecodeError:
        return {"shots": [], "error": "Invalid JSON in optimize response"}


def _breakdown_shots(optimized: dict, shot_count: int, shot_duration: int) -> dict:
    """分镜头脚本拆分：将优化后的 shots 展开为起始帧/结束帧任务列表"""
    shots = optimized.get("shots", [])
    # 补齐镜头数
    while len(shots) < shot_count:
        idx = len(shots) + 1
        shots.append({
            "start_frame_prompt": f"Cinematic shot {idx} opening frame, high quality, film grain",
            "end_frame_prompt": f"Cinematic shot {idx} closing frame, high quality, film grain",
            "scene_description": f"镜头{idx}",
            "visual_prompt": f"Smooth cinematic transition, shot {idx}, {shot_duration}s",
        })
    shots = shots[:shot_count]

    return {
        "shot_count": shot_count,
        "shot_duration": shot_duration,
        "shots": shots,
    }


async def _generate_images(task_id: str, node_idx: int, breakdown: dict, req: SubmitRequest, settings):
    """生图：每镜头起始帧+结束帧，支持 jimeng / gpt-image-2 / minimax，每批3张并行+重试"""

    state = await workflow_executor.load_task(task_id)
    node = state["nodes"][node_idx]
    subtasks = node.get("subtasks", [])
    shots = breakdown.get("shots", [])
    image_model = getattr(req, "image_model", "jimeng")

    # 选择生图 provider
    if image_model == "gpt-image-2":
        gen_one = _gen_one_gpt_image_2(settings)
    elif image_model == "minimax":
        gen_one = _gen_one_minimax(settings)
    else:
        gen_one = _gen_one_jimeng(settings)

    # 每批 3 张并行
    batch_size = 3
    max_retries = 3
    for batch_start in range(0, len(subtasks), batch_size):
        batch = subtasks[batch_start:batch_start + batch_size]
        for global_idx, st in enumerate(batch):
            subtask_idx = batch_start + global_idx
            # shot_idx: 起始帧和结束帧交替，shot-N-start 和 shot-N-end 共享同一个 shot
            shot_num = (subtask_idx // 2) + 1
            is_start = "start" in st["id"]
            prompt_key = "start_frame_prompt" if is_start else "end_frame_prompt"
            shot_data = shots[shot_num - 1] if shot_num - 1 < len(shots) else {}
            prompt = shot_data.get(prompt_key, shot_data.get("scene_description", ""))
            if not prompt:
                prompt = f"TVC shot {shot_num} {'start' if is_start else 'end'} frame, cinematic, high quality"

            for attempt in range(1, max_retries + 1):
                try:
                    await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                        "status": "running", "progress": 30,
                        "message": f"生成中 ({image_model}, 尝试 {attempt}/{max_retries})...",
                    })
                    result = await gen_one(st, prompt)
                    await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                        "status": "success", "progress": 100, "result": result,
                    })
                    break
                except Exception as e:
                    if attempt == max_retries:
                        await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                            "status": "error", "progress": 0, "error": str(e),
                        })

    await workflow_executor.update_node(task_id, node_idx, {"status": "success", "progress": 100})


def _gen_one_jimeng(settings):
    """即梦图片生成闭包"""


    api_key = settings.JIMENG_API_KEY
    base_url = settings.JIMENG_API_BASE_URL

    async def _gen(st: dict, prompt: str) -> dict:
        if not api_key:
            await asyncio.sleep(1.5)
            return {"image_url": f"placeholder_{st['id']}.png"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/image/generation",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "jimeng-image-01", "prompt": prompt, "size": "1K", "aspect_ratio": "16:9"},
            )
            if resp.status_code != 200:
                raise Exception(f"Jimeng image error: {resp.status_code}")
            data = resp.json()
            return {"image_url": data.get("data", {}).get("image_url", "")}

    return _gen


def _gen_one_gpt_image_2(settings):
    """GPT-Image-2 via wuyinkeji 异步任务模式（提交→轮询）"""


    api_key = settings.WUYINKEJI_API_KEY
    base_url = settings.WUYINKEJI_API_BASE_URL.rstrip("/")

    async def _gen(st: dict, prompt: str) -> dict:
        if not api_key:
            await asyncio.sleep(1.5)
            return {"image_url": f"placeholder_{st['id']}.png"}

        # 提交异步任务
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/api/async/image_gpt?key={api_key}",
                data={"prompt": prompt, "size": "auto"},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code != 200:
                raise Exception(f"GPT-Image-2 submit error: {resp.status_code}")
            result = resp.json()
            if result.get("code") != 200:
                raise Exception(f"GPT-Image-2 submit failed: {result.get('msg', 'unknown')}")

            task_uid = result.get("data", {}).get("id", "")
            if not task_uid:
                raise Exception(f"No task id in GPT-Image-2 response")

        # 轮询等待（最长3分钟）
        max_wait = 180
        interval = 5
        elapsed = 0
        async with httpx.AsyncClient(timeout=30) as client:
            while elapsed < max_wait:
                await asyncio.sleep(interval)
                elapsed += interval

                resp = await client.get(
                    f"{base_url}/api/async/detail?key={api_key}&id={task_uid}"
                )
                if resp.status_code != 200:
                    continue
                data = resp.json().get("data", {})
                status = data.get("status", 0)

                if status == 2:  # 成功
                    result_data = data.get("result", {})
                    url = ""
                    if isinstance(result_data, str):
                        url = result_data
                    elif isinstance(result_data, list) and result_data:
                        item = result_data[0]
                        url = item if isinstance(item, str) else item.get("url", "")
                    elif isinstance(result_data, dict):
                        url = result_data.get("url", "")
                    if not url:
                        raise Exception(f"GPT-Image-2 succeeded but no URL: {data}")
                    return {"image_url": url}

                if status not in (0, 1):  # 非处理中
                    raise Exception(f"GPT-Image-2 failed with status={status}")

        raise Exception(f"GPT-Image-2 timeout after {max_wait}s (task: {task_uid})")

    return _gen


def _gen_one_minimax(settings):
    """MiniMax image-01 同步生图"""


    api_key = settings.MINIMAX_API_KEY
    base_url = settings.MINIMAX_API_BASE_URL.rstrip("/")

    async def _gen(st: dict, prompt: str) -> dict:
        if not api_key:
            await asyncio.sleep(1.5)
            return {"image_url": f"placeholder_{st['id']}.png"}

        body = {
            "model": "image-01",
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "n": 1,
            "response_format": "url",
            "prompt_optimizer": True,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{base_url}/image_generation",
                json=body,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                raise Exception(f"MiniMax image error: {resp.status_code} {resp.text}")

            data = resp.json()
            base_resp = data.get("base_resp", {})
            if base_resp.get("status_code", 0) != 0:
                raise Exception(f"MiniMax image failed: {base_resp.get('status_msg', 'unknown')}")

            urls = data.get("data", {}).get("image_urls", [])
            if not urls:
                raise Exception(f"No image_urls in MiniMax response: {resp.text}")

            return {"image_url": urls[0]}

    return _gen


def _submit_video_glm(settings):
    """CogVideoX-3 视频提交 + 轮询"""

    api_key = settings.GLM_API_KEY
    base_url = settings.GLM_API_BASE_URL.rstrip("/")
    model = "cogvideox-3"

    async def _run(shot_num: int, first_url: str, last_url: str, duration: int) -> dict:
        if not api_key or not first_url:
            raise Exception(f"缺少 GLM_API_KEY 或首帧图片 (shot {shot_num})")

        image_url: str | list[str] = first_url
        if last_url:
            image_url = [first_url, last_url]

        body: dict = {
            "model": model,
            "prompt": f"TVC镜头{shot_num}，{duration}秒，流畅过渡，电影级画质",
            "image_url": image_url,
            "quality": "quality",
            "size": "1920x1080",
            "fps": 30,
        }

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{base_url}/videos/generations", json=body, headers=headers)
        if resp.status_code != 200:
            raise Exception(f"CogVideoX-3 submit error: {resp.status_code} {resp.text}")

        task_id = resp.json().get("id", "")
        if not task_id:
            raise Exception(f"No task_id in CogVideoX-3 response: {resp.text}")

        video_url = await _poll_glm_video(api_key, base_url, task_id)
        return {"video_url": video_url, "provider_task_id": task_id}

    return _run


def _submit_video_seedance(settings):
    """Seedance 2.0 视频提交 + 轮询"""

    ark_key = settings.ARK_API_KEY
    ark_base = settings.ARK_API_BASE_URL.rstrip("/")
    model = "doubao-seedance-1-5-pro-251215"

    async def _run(shot_num: int, first_url: str, last_url: str, duration: int) -> dict:
        if not ark_key or not first_url:
            raise Exception(f"缺少 ARK_API_KEY 或首帧图片 (shot {shot_num})")

        content = [
            {"type": "text", "text": f"TVC镜头{shot_num}，{duration}秒，流畅过渡，电影级画质"},
            {"type": "image_url", "image_url": {"url": first_url}, "role": "first_frame"},
        ]
        if last_url:
            content.append({"type": "image_url", "image_url": {"url": last_url}, "role": "last_frame"})

        body = {"model": model, "content": content}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{ark_base}/contents/generations/tasks",
                json=body,
                headers={"Authorization": f"Bearer {ark_key}", "Content-Type": "application/json"},
            )
        if resp.status_code != 200:
            raise Exception(f"Seedance submit error: {resp.status_code} {resp.text}")

        task_id = resp.json().get("id", "")
        if not task_id:
            raise Exception(f"No task_id in Seedance response: {resp.text}")

        video_url = await _poll_seedance(ark_key, ark_base, task_id)
        return {"video_url": video_url, "provider_task_id": task_id}

    return _run


def _submit_video_minimax(settings):
    """MiniMax Hailuo 视频提交 + 轮询 + 下载"""

    api_key = settings.MINIMAX_API_KEY
    base_url = settings.MINIMAX_API_BASE_URL.rstrip("/")
    model = "MiniMax-Hailuo-02"

    async def _run(shot_num: int, first_url: str, last_url: str, duration: int) -> dict:
        if not api_key:
            raise Exception("MINIMAX_API_KEY not configured")

        body: dict = {
            "model": model,
            "prompt": f"TVC镜头{shot_num}，{duration}秒，流畅过渡，电影级画质",
            "first_frame_image": first_url,
            "duration": duration,
            "resolution": "1080P",
        }
        if last_url:
            body["last_frame_image"] = last_url

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        # Step 1: 提交
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{base_url}/video_generation", json=body, headers=headers)
        if resp.status_code != 200:
            raise Exception(f"MiniMax video submit error: {resp.status_code} {resp.text}")

        data = resp.json()
        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", 0) != 0:
            raise Exception(f"MiniMax video submit failed: {base_resp.get('status_msg', 'unknown')}")

        task_id = data.get("task_id", "")
        if not task_id:
            raise Exception(f"No task_id in MiniMax response: {resp.text}")

        # Step 2: 轮询
        file_id = await _poll_minimax_video(api_key, base_url, task_id)

        # Step 3: 下载
        async with httpx.AsyncClient(timeout=30) as client:
            dl_resp = await client.get(
                f"{base_url}/files/retrieve?file_id={file_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
        if dl_resp.status_code != 200:
            raise Exception(f"MiniMax file download error: {dl_resp.status_code} {dl_resp.text}")

        dl_data = dl_resp.json()
        video_url = dl_data.get("file", {}).get("download_url", "")
        if not video_url:
            raise Exception(f"No download_url in MiniMax file response: {dl_resp.text}")

        return {"video_url": video_url, "provider_task_id": task_id}

    return _run


async def _generate_videos(task_id: str, node_idx: int, breakdown: dict, req: SubmitRequest, settings):
    """线性调度视频生成（支持 Seedance / MiniMax Hailuo / CogVideoX-3）+ 并行 BGM"""
    state = await workflow_executor.load_task(task_id)
    node = state["nodes"][node_idx]
    subtasks = node.get("subtasks", [])

    # 从生图节点(node_idx-1)获取首尾帧图片URL
    image_node = state["nodes"][node_idx - 1]
    image_subtasks = image_node.get("subtasks", [])
    image_map: dict[str, str] = {}
    for ist in image_subtasks:
        result = ist.get("result", {})
        url = result.get("image_url", "")
        if url and not url.startswith("placeholder_"):
            image_map[ist["id"]] = url

    # BGM 并行启动
    bgm_subtask = next((st for st in subtasks if st["id"] == "bgm"), None)
    bgm_task = None
    if bgm_subtask:
        bgm_task = asyncio.create_task(_generate_bgm(task_id, node_idx, bgm_subtask, req, settings))

    # 选择视频 provider
    video_model = getattr(req, "video_model", "jimeng") or "jimeng"
    if video_model == "minimax":
        submit_fn = _submit_video_minimax(settings)
    elif video_model == "glm":
        submit_fn = _submit_video_glm(settings)
    else:
        submit_fn = _submit_video_seedance(settings)

    provider_names = {"minimax": "MiniMax Hailuo", "glm": "CogVideoX-3", "seedance": "Seedance", "jimeng": "Seedance"}
    provider_name = provider_names.get(video_model, "Seedance")

    # 视频逐镜头线性调度
    video_subtasks = [st for st in subtasks if st["id"] != "bgm"]
    for i, st in enumerate(video_subtasks):
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                    "status": "running",
                    "progress": 10,
                    "message": f"提交{provider_name}视频任务 (尝试 {attempt}/{max_retries})",
                })

                shot_num = i + 1
                first_key = f"shot-{shot_num}-start"
                last_key = f"shot-{shot_num}-end"
                first_url = image_map.get(first_key, "")
                last_url = image_map.get(last_key, "")

                result = await submit_fn(shot_num, first_url, last_url, req.shot_duration)

                await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                    "status": "success",
                    "progress": 100,
                    "result": result,
                })
                break
            except Exception as e:
                if attempt == max_retries:
                    await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                        "status": "error",
                        "progress": 0,
                        "error": str(e),
                    })

    # 等待 BGM 完成
    if bgm_task:
        await bgm_task

    await workflow_executor.update_node(task_id, node_idx, {"status": "success", "progress": 100})


async def _generate_bgm(task_id: str, node_idx: int, subtask: dict, req: SubmitRequest, settings):
    """BGM 生成（MiniMax Music 2.6，同步接口）"""


    api_key = settings.MINIMAX_API_KEY
    base_url = settings.MINIMAX_API_BASE_URL

    await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
        "status": "running", "progress": 30, "message": "MiniMax Music 生成中",
    })

    if not api_key:
        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "error", "progress": 0, "error": "MINIMAX_API_KEY not configured",
        })
        return

    try:
        body = {
            "model": "music-2.6",
            "prompt": f"TVC广告背景音乐，{req.mode}风格，{req.total_duration}秒，无歌词",
            "is_instrumental": True,
            "output_format": "url",
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{base_url}/music_generation",
                json=body,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )

        if resp.status_code != 200:
            raise Exception(f"MiniMax Music error: {resp.status_code} {resp.text}")

        data = resp.json()
        audio_url = data.get("data", {}).get("audio_url", "") or data.get("audio_url", "")
        if not audio_url:
            # 适配不同响应格式
            extra = data.get("data", data)
            audio_url = extra.get("url", "") if isinstance(extra, dict) else ""

        if not audio_url:
            raise Exception(f"No audio_url in MiniMax response: {resp.text}")

        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "success", "progress": 100,
            "result": {"audio_url": audio_url},
        })
    except Exception as e:
        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "error", "progress": 0, "error": str(e),
        })


async def _poll_glm_video(api_key: str, base_url: str, task_id: str, max_wait: int = 300, interval: int = 15) -> str:
    """轮询 CogVideoX-3 异步任务直到完成，返回视频URL"""


    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            resp = await client.get(
                f"{base_url}/async-result/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            task_status = data.get("task_status", "")

            if task_status == "SUCCESS":
                video_result = data.get("video_result", [])
                if isinstance(video_result, list) and video_result:
                    return video_result[0].get("url", "")
                # 兼容其他响应结构
                result = data.get("results", data.get("data", {}))
                if isinstance(result, list) and result:
                    return result[0].get("url", "")
                if isinstance(result, dict):
                    return result.get("url", result.get("video_url", ""))
                raise Exception(f"CogVideoX-3 succeeded but no video URL: {data}")

            if task_status in ("FAIL", "FAILED"):
                error_msg = data.get("error", {}).get("message", data.get("message", "Unknown error"))
                raise Exception(f"CogVideoX-3 task failed: {error_msg}")

            # PROCESSING | PENDING — continue polling

    raise Exception(f"CogVideoX-3 task timeout after {max_wait}s (task: {task_id})")


async def _poll_seedance(api_key: str, base_url: str, task_id: str, max_wait: int = 300, interval: int = 15) -> str:
    """轮询 Seedance 异步任务直到完成，返回视频URL"""


    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            resp = await client.get(
                f"{base_url}/contents/generations/tasks/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            status = data.get("status", "")

            if status in ("succeeded", "success"):
                # 提取视频URL
                result_data = data.get("data", [])
                if isinstance(result_data, list) and result_data:
                    return result_data[0].get("url", "")
                if isinstance(result_data, dict):
                    return result_data.get("url", "")
                content = data.get("content", {})
                if isinstance(content, dict):
                    return content.get("video_url", content.get("url", ""))
                raise Exception(f"Seedance succeeded but no video URL: {data}")

            if status in ("failed", "error"):
                error_msg = data.get("error", {}).get("message", "Unknown error")
                raise Exception(f"Seedance task failed: {error_msg}")

    raise Exception(f"Seedance task timeout after {max_wait}s (task: {task_id})")


async def _poll_minimax_video(api_key: str, base_url: str, task_id: str, max_wait: int = 300, interval: int = 15) -> str:
    """轮询 MiniMax Hailuo 异步视频任务，返回 file_id"""


    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            resp = await client.get(
                f"{base_url}/query/video_generation?task_id={task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            base_resp = data.get("base_resp", {})
            if base_resp.get("status_code", 0) != 0:
                raise Exception(f"MiniMax video query failed: {base_resp.get('status_msg', 'unknown')}")

            status = data.get("status", "")

            if status == "Success":
                file_id = data.get("file_id", "")
                if not file_id:
                    raise Exception(f"MiniMax Success but no file_id: {data}")
                return file_id

            if status == "Fail":
                raise Exception(f"MiniMax video task failed: {data}")

            # Preparing | Queueing | Processing — continue polling

    raise Exception(f"MiniMax video timeout after {max_wait}s (task: {task_id})")
