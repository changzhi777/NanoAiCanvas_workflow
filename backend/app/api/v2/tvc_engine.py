"""
TVC 执行引擎
5 步线性编排 + 积分扣退 + 真正批量并行
"""
import json
import asyncio
import logging
import re
import uuid
import httpx
from typing import Optional

from app.config import get_settings
from app.services import workflow_executor
from .tvc_providers import get_image_provider, get_video_provider

logger = logging.getLogger(__name__)


# ==================== 配置解析 ====================

async def _resolve_tvc_config(user_id=None, req=None) -> dict:
    """从数据库读取配置：请求级 > 用户 > 全局 > 硬编码默认值"""
    from .tvc_config import DEFAULT_CONFIG, _merge_config, _config_to_dict
    from app.database import async_session_maker
    from app.models.tvc_config import TvcWorkflowConfig
    from sqlalchemy import select

    merged = DEFAULT_CONFIG.copy()
    async with async_session_maker() as db:
        # 全局配置
        stmt = select(TvcWorkflowConfig).where(TvcWorkflowConfig.scope == "global")
        result = await db.execute(stmt)
        global_cfg = result.scalar_one_or_none()
        if global_cfg:
            merged = _merge_config(merged, _config_to_dict(global_cfg))

        # 用户配置
        if user_id:
            stmt = select(TvcWorkflowConfig).where(
                TvcWorkflowConfig.scope == "user",
                TvcWorkflowConfig.user_id == user_id,
            )
            result = await db.execute(stmt)
            user_cfg = result.scalar_one_or_none()
            if user_cfg:
                merged = _merge_config(merged, _config_to_dict(user_cfg))

    # 请求级覆盖（来自前端属性面板传入的字段）
    if req:
        if getattr(req, "script_model", None):
            merged["step1_script"] = {**merged.get("step1_script", {}), "model": req.script_model}
        if getattr(req, "optimize_model", None):
            merged["step2_optimize"] = {**merged.get("step2_optimize", {}), "model": req.optimize_model}
        if getattr(req, "bgm_model", None):
            merged["step5_bgm"] = {**merged.get("step5_bgm", {}), "model": req.bgm_model}

    return merged


# ==================== 积分管理 ====================

async def deduct_points(user_id, req, force_personal: bool = False) -> int:
    """预扣积分（团队优先），返回扣除金额"""
    from app.services.points_service import node_type_to_model_type, resolve_price, deduct_team_first
    from app.database import async_session_maker

    async with async_session_maker() as db:
        text_price = await resolve_price(db, node_type_to_model_type("script_generator"))
        image_price = await resolve_price(db, node_type_to_model_type("storyboard_generator"))
        video_price = await resolve_price(db, node_type_to_model_type("storyboard_video"))
        bgm_price = await resolve_price(db, node_type_to_model_type("background_music"))

        text_cost = text_price * 3
        image_cost = image_price * req.shot_count * 2
        video_cost = video_price * req.shot_count
        total = text_cost + image_cost + video_cost + bgm_price

        result = await deduct_team_first(
            db, user_id, total,
            description=f"TVC工作流预扣（{req.shot_count}镜头）",
            force_personal=force_personal,
        )
        return total


async def refund_points(user_id, amount: int):
    """退还积分（退回原扣减账户）"""
    from app.database import async_session_maker
    from app.services.points_service import get_user_team, get_team_account, get_or_create_account

    async with async_session_maker() as db:
        team_id = await get_user_team(db, user_id)
        if team_id:
            team_account = await get_team_account(db, team_id)
            if team_account:
                team_account.balance += amount
                await db.commit()
                return
        account = await get_or_create_account(db, user_id)
        account.balance += amount
        await db.commit()


# ==================== 5 步执行 ====================

async def execute_tvc(task_id: str, req, user_id=None):
    """线性执行 5 步 TVC 流程，含积分预扣+失败退款"""
    settings = get_settings()
    deducted = 0

    try:
        # 解析配置：请求 > 用户 > 全局 > 硬编码
        config = await _resolve_tvc_config(user_id, req)

        # 积分预扣
        if user_id:
            deducted = await deduct_points(user_id, req, force_personal=req.force_personal_points)

        state = await workflow_executor.load_task(task_id)
        state["status"] = "running"
        await workflow_executor._save(task_id, state)
        await workflow_executor._publish(task_id, state)

        # Step 1: 剧本生成（GLM优先，失败fallback MiniMax）
        await workflow_executor.update_node(task_id, 0, {"status": "running", "progress": 0})
        script_result = None
        try:
            script_result = await _call_glm_tvc_script(req, settings, config)
        except Exception as e:
            logger.warning(f"GLM script failed, fallback to MiniMax: {e}")
            script_result = await _call_minimax_tvc_script(req, settings, config)
        if not script_result:
            raise Exception("剧本生成失败：GLM 和 MiniMax 均不可用")
        await workflow_executor.update_node(task_id, 0, {
            "status": "success", "progress": 100, "result": script_result,
        })

        # Step 2: 提示词优化
        await workflow_executor.update_node(task_id, 1, {"status": "running", "progress": 0})
        optimized = await _optimize_prompts(script_result, req, settings, config)
        if not optimized.get("shots"):
            raise Exception("提示词优化返回空结果，无法继续生成分镜头")
        await workflow_executor.update_node(task_id, 1, {
            "status": "success", "progress": 100, "result": optimized,
        })

        # Step 3: 分镜头脚本
        await workflow_executor.update_node(task_id, 2, {"status": "running", "progress": 0})
        breakdown = _breakdown_shots(optimized, req.shot_count, req.shot_duration)
        await workflow_executor.update_node(task_id, 2, {
            "status": "success", "progress": 100, "result": breakdown,
        })

        # Step 4: 生图（真正批量并行）
        await workflow_executor.update_node(task_id, 3, {"status": "running", "progress": 0})
        await _generate_images_parallel(task_id, 3, breakdown, req, settings, config)

        # Step 5: 参考图生视频
        await workflow_executor.update_node(task_id, 4, {"status": "running", "progress": 0})
        await _generate_videos(task_id, 4, breakdown, req, settings, config)

        await workflow_executor.complete_task(task_id, "completed")

    except Exception as e:
        # 失败退款
        if deducted > 0 and user_id:
            try:
                await refund_points(user_id, deducted)
                logger.info(f"TVC task {task_id} failed, refunded {deducted} points to user {user_id}")
            except Exception as refund_err:
                logger.error(f"TVC refund failed for task {task_id}: {refund_err}")
        await workflow_executor.fail_task(task_id, str(e))


# ==================== Step 1: 剧本生成 ====================

async def _call_glm_tvc_script(req, settings, config: dict = None) -> dict:
    from .glm_proxy import TVC_SCRIPT_PROMPT, TVC_MODE_CONSTRAINTS, STYLE_MAP, _find_balanced, _repair_json

    cfg = (config or {}).get("step1_script", {})
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
    model = cfg.get("model") or model_map.get(req.optimize_mode, "glm-5.1")

    api_params = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请生成以下TVC广告的结构化脚本：\n{req.prompt}"},
        ],
        "temperature": cfg.get("temperature", 1.0 if is_thinking else 0.7),
        "max_tokens": cfg.get("max_tokens", 8192),
    }
    if is_thinking:
        api_params["thinking"] = {"type": "enabled"}

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(
            f"{settings.GLM_API_BASE_URL}/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {settings.GLM_API_KEY}"},
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

    # 解析 JSON 并返回结构化数据
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

    if json_str:
        try:
            script = json.loads(json_str)
        except json.JSONDecodeError:
            try:
                cleaned = _repair_json(json_str)
                script = json.loads(cleaned)
            except json.JSONDecodeError:
                script = {}
    else:
        script = {}

    return {"raw_content": content, "parsed_script": script}


async def _call_minimax_tvc_script(req, settings, config: dict = None) -> dict:
    from .minimax import SCREENPLAY_PROMPT
    import os
    cfg = (config or {}).get("step1_script", {})
    api_key = getattr(settings, "MINIMAX_API_KEY", "") or os.environ.get("MINIMAX_API_KEY", "")
    base_url = getattr(settings, "MINIMAX_API_BASE_URL", "https://api.minimaxi.com/v1")
    if not api_key:
        raise Exception("MiniMax API Key 未配置")

    style = getattr(req, "style", "realistic")
    model = cfg.get("fallback_model", "MiniMax-M2.7")

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/text/chatcompletion_v2",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SCREENPLAY_PROMPT},
                    {"role": "user", "content": f"创作一个短片剧本。主题：{req.prompt}\n风格：{style}\n镜头数：{req.shot_count}\n每镜头时长：{req.shot_duration}秒"},
                ],
                "temperature": 0.8,
            },
        )

    if resp.status_code != 200:
        raise Exception(f"MiniMax script error: {resp.status_code} {resp.text[:200]}")

    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    json_match = re.search(r'\{.*\}', content, re.DOTALL)
    if json_match:
        try:
            script = json.loads(json_match.group())
            return {"raw_content": content, "parsed_script": script}
        except json.JSONDecodeError:
            pass
    return {"raw_content": content, "parsed_script": {}}


# ==================== Step 2: 提示词优化 ====================

async def _optimize_prompts(script_result: dict, req, settings, config: dict = None) -> dict:
    raw = script_result.get("raw_content", "")
    cfg = (config or {}).get("step2_optimize", {})

    system_prompt = f"""你是 TVC 广告分镜提示词专家。根据以下 TVC 脚本，为每个镜头生成：
1. start_frame_prompt: 起始帧画面描述（英文，用于图片生成，50-80词）
2. end_frame_prompt: 结束帧画面描述（英文，用于图片生成，50-80词）
3. scene_description: 镜头场景中文概述（20字以内）
4. visual_prompt: 视频动态描述（英文，用于视频生成提示词，30-50词）

风格：{req.style}，模式：{req.mode}

严格返回 JSON 数组，每个元素对应一个镜头：
[{{"start_frame_prompt": "...", "end_frame_prompt": "...", "scene_description": "...", "visual_prompt": "..."}}]

只返回 JSON，不要其他内容。"""

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.GLM_API_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {settings.GLM_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": cfg.get("model", "glm-4.5-air"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": raw},
                ],
                "temperature": cfg.get("temperature", 0.7),
                "max_tokens": cfg.get("max_tokens", 4096),
            },
        )

    if resp.status_code != 200:
        raise Exception(f"GLM optimize error: {resp.status_code}")

    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    json_match = re.search(r'\[.*\]', content, re.DOTALL)
    if not json_match:
        raise Exception("提示词优化返回无法解析的内容")

    try:
        shots = json.loads(json_match.group())
        return {"shots": shots}
    except json.JSONDecodeError:
        raise Exception("提示词优化返回无效 JSON")


# ==================== Step 3: 分镜头拆分 ====================

def _breakdown_shots(optimized: dict, shot_count: int, shot_duration: int) -> dict:
    shots = optimized.get("shots", [])
    if len(shots) < shot_count:
        logger.warning(f"分镜头不足：期望 {shot_count}，实际 {len(shots)}，补齐中")
    while len(shots) < shot_count:
        idx = len(shots) + 1
        shots.append({
            "start_frame_prompt": f"Cinematic shot {idx} opening frame, high quality, film grain",
            "end_frame_prompt": f"Cinematic shot {idx} closing frame, high quality, film grain",
            "scene_description": f"镜头{idx}",
            "visual_prompt": f"Smooth cinematic transition, shot {idx}, {shot_duration}s",
        })
    shots = shots[:shot_count]
    return {"shot_count": shot_count, "shot_duration": shot_duration, "shots": shots}


# ==================== Step 4: 生图（并行） ====================

async def _generate_images_parallel(task_id: str, node_idx: int, breakdown: dict, req, settings, config: dict = None):
    """每批 3 张真正并行 + 重试"""
    state = await workflow_executor.load_task(task_id)
    node = state["nodes"][node_idx]
    subtasks = node.get("subtasks", [])
    shots = breakdown.get("shots", [])

    cfg = (config or {}).get("step4_image", {})
    image_model = getattr(req, "image_model", None) or cfg.get("default_provider", "gpt-image-2")
    gen_one = get_image_provider(image_model, settings)

    batch_size = 3
    max_retries = 3

    for batch_start in range(0, len(subtasks), batch_size):
        batch = subtasks[batch_start:batch_start + batch_size]

        async def _process_one(st, idx):
            shot_num = (idx // 2) + 1
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
                    return
                except Exception as e:
                    if attempt == max_retries:
                        await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                            "status": "error", "progress": 0, "error": str(e),
                        })

        # 真正并行
        await asyncio.gather(*[
            _process_one(st, batch_start + i)
            for i, st in enumerate(batch)
        ])

    await workflow_executor.update_node(task_id, node_idx, {"status": "success", "progress": 100})


# ==================== Step 5: 视频生成 ====================

async def _generate_videos(task_id: str, node_idx: int, breakdown: dict, req, settings, config: dict = None):
    state = await workflow_executor.load_task(task_id)
    node = state["nodes"][node_idx]
    subtasks = node.get("subtasks", [])

    image_node = state["nodes"][node_idx - 1]
    image_subtasks = image_node.get("subtasks", [])
    image_map: dict[str, str] = {}
    for ist in image_subtasks:
        result = ist.get("result", {})
        url = result.get("image_url", "")
        if url and not url.startswith("placeholder_"):
            image_map[ist["id"]] = url

    bgm_subtask = next((st for st in subtasks if st["id"] == "bgm"), None)
    bgm_task = None
    if bgm_subtask:
        bgm_task = asyncio.create_task(_generate_bgm(task_id, node_idx, bgm_subtask, req, settings, config))

    video_cfg = (config or {}).get("step5_video", {})
    primary_model = getattr(req, "video_model", None) or video_cfg.get("default_provider", "minimax") or "minimax"

    # fallback 链：主模型失败后尝试备选
    fallback_chain = [primary_model]
    for fb in ["minimax", "glm", "seedance"]:
        if fb not in fallback_chain:
            fallback_chain.append(fb)

    video_subtasks = [st for st in subtasks if st["id"] != "bgm"]

    async def _process_video(i: int, st: dict):
        shot_num = i + 1
        first_url = image_map.get(f"shot-{shot_num}-start", "")
        last_url = image_map.get(f"shot-{shot_num}-end", "")

        for model_name in fallback_chain:
            try:
                submit_fn, provider_name = get_video_provider(model_name, settings)
                await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                    "status": "running", "progress": 10,
                    "message": f"提交{provider_name}视频任务",
                })
                result = await submit_fn(shot_num, first_url, last_url, req.shot_duration)
                await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                    "status": "success", "progress": 100, "result": result,
                })
                return
            except Exception as e:
                err_msg = str(e)
                is_quota = "usage limit" in err_msg or "配额" in err_msg or "limit exceeded" in err_msg
                logger.warning(f"Video shot {shot_num} failed with {model_name}: {err_msg[:120]}")
                if model_name == fallback_chain[-1]:
                    # 所有 provider 都失败
                    await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                        "status": "error", "progress": 0, "error": err_msg,
                    })
                elif is_quota:
                    # 配额耗尽，跳过该 provider 的后续重试
                    logger.info(f"Quota exhausted for {model_name}, falling back")
                    continue
                else:
                    continue

    # 并行生成所有视频（最大化配额利用率）
    await asyncio.gather(*[_process_video(i, st) for i, st in enumerate(video_subtasks)])

    if bgm_task:
        await bgm_task

    await workflow_executor.update_node(task_id, node_idx, {"status": "success", "progress": 100})


async def _generate_bgm(task_id: str, node_idx: int, subtask: dict, req, settings, config: dict = None):
    api_key = settings.MINIMAX_API_KEY
    base_url = settings.MINIMAX_API_BASE_URL
    bgm_cfg = (config or {}).get("step5_bgm", {})

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
            "model": bgm_cfg.get("model", "music-2.6"),
            "prompt": f"TVC广告背景音乐，{req.mode}风格，{req.total_duration}秒，无歌词",
            "is_instrumental": bgm_cfg.get("is_instrumental", True),
            "output_format": "url",
        }

        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{base_url}/music_generation",
                json=body,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )

        if resp.status_code != 200:
            raise Exception(f"MiniMax Music error: {resp.status_code} {resp.text}")

        data = resp.json()
        audio_url = ""
        d = data.get("data", {})
        if isinstance(d, dict):
            audio_url = d.get("audio_url", "") or d.get("audio", "") or d.get("url", "")
        if not audio_url:
            audio_url = data.get("audio_url", "")

        if not audio_url:
            raise Exception(f"No audio_url in MiniMax response: {resp.text}")

        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "success", "progress": 100, "result": {"audio_url": audio_url},
        })
    except asyncio.CancelledError:
        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "error", "progress": 0, "error": "BGM generation was cancelled",
        })
        raise
    except Exception as e:
        error_msg = str(e) or repr(e) or "Unknown BGM error"
        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "error", "progress": 0, "error": error_msg,
        })
