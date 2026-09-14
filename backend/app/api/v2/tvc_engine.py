"""
TVC 执行引擎
5 步线性编排 + 积分扣退 + 真正批量并行
"""
import json
import asyncio
import logging
import re
from typing import Optional
import httpx

from app.config import get_settings
from app.services import workflow_executor
from app.services.image_description_cache import ImageDescriptionCache
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
        image_cost = image_price * 2  # 主参考图 + 场景设计图
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

        # Step 5: 参考图生视频（minimax 主路 → Seedance 兜底）
        await workflow_executor.update_node(task_id, 4, {"status": "running", "progress": 0})
        primary_video_model = req.video_model or "MiniMax-H3"
        try:
            await _generate_videos(task_id, 4, breakdown, req, settings, config, video_model=primary_video_model)
        except Exception as e:
            logger.warning(f"primary video ({primary_video_model}) failed, fallback to seedance: {e}")
            await workflow_executor.update_node(task_id, 4, {"status": "running", "progress": 0})
            await _generate_videos(task_id, 4, breakdown, req, settings, config, video_model="seedance")

        # Step 6: 保存资产到资产库
        if user_id:
            await _save_assets(task_id, user_id, req, breakdown)

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

    # Seedance 2.0 提示词增强
    from .seedance_constants import build_seedance_hints
    seedance_hints = build_seedance_hints(
        camera_movement=getattr(req, 'camera_movement', None),
        light_style=getattr(req, 'light_style', None),
        negative_prompts=getattr(req, 'negative_prompts', None),
    )
    if seedance_hints:
        system_prompt += "\n\n## Seedance 2.0 提示词增强约束\n" + "\n".join(f"- {h}" for h in seedance_hints)

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


def _sniff_image_mime(b64_or_url: str) -> str:
    """从裸 base64 magic bytes 嗅探 MIME；URL/已带 data: 前缀则透传。"""
    if b64_or_url.startswith("data:"):
        return b64_or_url  # 已带 data URI 直接用
    if b64_or_url.startswith("http://") or b64_or_url.startswith("https://"):
        return b64_or_url
    # 裸 base64：取前 16 字节猜 MIME
    head = b64_or_url[:24]
    try:
        import base64
        raw = base64.b64decode(head + "==", validate=False)
        if raw.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if raw.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if raw.startswith(b"RIFF") and b"WEBP" in raw:
            return "image/webp"
        if raw.startswith(b"GIF87a") or raw.startswith(b"GIF89a"):
            return "image/gif"
    except Exception:
        pass
    return "image/jpeg"  # fallback


def _to_data_uri(image: str) -> str:
    """URL/已带 data URI 直接返回；裸 base64 补前缀。"""
    if image.startswith("data:") or image.startswith("http://") or image.startswith("https://"):
        return image
    mime = _sniff_image_mime(image)
    return f"data:{mime};base64,{image}"


async def _describe_with_minimax_m3(image: str, settings) -> Optional[str]:
    """调 minimax M3 视觉理解，输出中文图描述（150-300 字）。

    返回 None 表示失败（让调用方 fallback）。
    默认走 /anthropic/v1/messages（更快 + 输出无 reasoning_content 噪音），
    可设 IMG_DESC_VISION_ENDPOINT=openai 走旧 chat/completions 兼容回退。
    """
    import os
    api_key = getattr(settings, "MINIMAX_API_KEY", "") or os.environ.get("MINIMAX_API_KEY", "")
    if not api_key:
        return None
    base_url = getattr(settings, "MINIMAX_API_BASE_URL", "https://api.minimax.cn/v1")
    # 兼容 base_url 带 /v1 后缀的拼接：直接拼路径会产生 /v1/anthropic/v1/messages
    anthropic_base = base_url.rstrip("/").removesuffix("/v1")
    endpoint = getattr(settings, "IMG_DESC_VISION_ENDPOINT", "anthropic")

    image_uri = _to_data_uri(image)
    prompt_text = (
        "用 150-300 字中文描述这张图的核心元素："
        "产品/人物/场景/构图/颜色/光线/情绪/风格/质感。"
        "输出要可直接用于 TVC 镜头脚本。"
    )

    if endpoint == "anthropic":
        # minimax 国内 /anthropic/v1/messages（Anthropic 兼容）
        url = f"{anthropic_base}/anthropic/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        api_params = {
            "model": "MiniMax-M3",
            "max_tokens": 500,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_uri.split(",", 1)[1]}},
                ],
            }],
            "temperature": 0.5,
        }
    else:
        # minimax /chat/completions（OpenAI 兼容回退）
        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        api_params = {
            "model": "MiniMax-M3",
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt_text},
                {"type": "image_url", "image_url": {"url": image_uri}},
            ]}],
            "temperature": 0.5,
            "max_tokens": 500,
        }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, headers=headers, json=api_params)
        if resp.status_code != 200:
            logger.warning(f"M3 描述失败 endpoint={endpoint} status={resp.status_code} text={resp.text[:120]}")
            return None
        data = resp.json()
        if endpoint == "anthropic":
            # Anthropic 响应：content 是数组 [{type, text}, ...]
            blocks = data.get("content", [])
            return "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip() or None
        # OpenAI 响应：choices[0].message.content
        return (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        ) or None
    except Exception as e:
        logger.warning(f"M3 描述异常 endpoint={endpoint}: {e}")
        return None


async def _call_minimax_tvc_script(req, settings, config: dict = None) -> dict:
    """minimax 剧本生成 — 有 reference_image 走 M3 多模态，无图走 M2.7 文本。"""
    from .minimax import SCREENPLAY_PROMPT
    import os
    cfg = (config or {}).get("step1_script", {})
    api_key = getattr(settings, "MINIMAX_API_KEY", "") or os.environ.get("MINIMAX_API_KEY", "")
    base_url = getattr(settings, "MINIMAX_API_BASE_URL", "https://api.minimax.cn/v1")
    # 兼容 base_url 带 /v1 后缀的拼接：直接拼路径会产生 /v1/anthropic/v1/messages
    anthropic_base = base_url.rstrip("/").removesuffix("/v1")
    vision_endpoint = getattr(settings, "IMG_DESC_VISION_ENDPOINT", "anthropic")
    if not api_key:
        raise Exception("MiniMax API Key 未配置")

    style = getattr(req, "style", "realistic")
    reference_image = getattr(req, "reference_image", None)
    use_vision = bool(reference_image)

    # 选择模型：有图=M3 多模态，无图=M2.7 文本（可被 cfg 覆盖）
    if use_vision:
        model = cfg.get("vision_model", "MiniMax-M3")
    else:
        model = cfg.get("fallback_model", "MiniMax-M2.7")

    # 构造 system prompt（保留原风格/Seedance 增强）
    system_prompt = SCREENPLAY_PROMPT
    style_instruction = ""
    # Seedance 增强
    try:
        from .seedance_constants import build_seedance_hints
        hints = build_seedance_hints(
            camera_movement=getattr(req, "camera_movement", None),
            light_style=getattr(req, "light_style", None),
            negative_prompts=getattr(req, "negative_prompts", None),
        )
        if hints:
            system_prompt += "\n\n## Seedance 2.0 提示词增强约束\n" + "\n".join(f"- {h}" for h in hints)
    except Exception:
        pass
    # style_reference
    if getattr(req, "style_reference", None):
        system_prompt += f"\n\n## 产品视觉风格约束（必须遵循）\n{req.style_reference}"
    if style:
        system_prompt += f"\n\n## 画面风格\n{style}"

    # 构造 user content：有图用多模态 content 数组（图描述优先走缓存，省 token + 提速）
    if use_vision:
        # 缓存命中：描述注入 user text，image 仍走 M3（描述+图组合最强）
        cached_desc = await ImageDescriptionCache.get_or_describe(
            reference_image,
            model=cfg.get("vision_model", "MiniMax-M3"),
            describe_fn=lambda img: _describe_with_minimax_m3(img, settings),
        )
        image_uri = _to_data_uri(reference_image)
        text_block = (
            f"创作一个短片剧本。主题：{getattr(req, 'prompt', '')}\n"
            f"风格：{style}\n"
            f"镜头数：{getattr(req, 'shot_count', 6)}\n"
            f"每镜头时长：{getattr(req, 'shot_duration', 5)}秒\n"
            "请仔细分析参考图中的产品/场景/人物/风格/色调，并据此构思 TVC。"
        )
        if cached_desc:
            text_block += f"\n\n## 参考图描述（缓存命中）\n{cached_desc}"
        user_content = [
            {"type": "text", "text": text_block},
            {"type": "image_url", "image_url": {"url": image_uri}},
        ]
    else:
        user_content = (
            f"创作一个短片剧本。主题：{getattr(req, 'prompt', '')}\n"
            f"风格：{style}\n"
            f"镜头数：{getattr(req, 'shot_count', 6)}\n"
            f"每镜头时长：{getattr(req, 'shot_duration', 5)}秒"
        )

    # endpoint 开关：anthropic 走 minimax 兼容 messages API（更快无噪音）；openai 走 chat/completions
    if use_vision and vision_endpoint == "anthropic":
        # minimax Anthropic 兼容端点 — system 走顶层 field，image 走 image source（base64）
        b64_data = image_uri.split(",", 1)[1] if image_uri.startswith("data:") else image_uri
        api_params = {
            "model": model,
            "system": system_prompt,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": text_block},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64_data}},
                ],
            }],
            "temperature": 0.8,
            "max_tokens": 8192,
        }
    else:
        api_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.8,
            "max_tokens": 8192,
        }

    try:
        async with httpx.AsyncClient(timeout=300) as client:
            if use_vision and vision_endpoint == "anthropic":
                resp = await client.post(
                    f"{anthropic_base}/anthropic/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=api_params,
                )
            else:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=api_params,
                )
    except Exception as e:
        # TimeoutException / 网络错：让上游 fallback（不再吞 502）
        raise Exception(f"minimax API 调用失败: {type(e).__name__}: {e}")

    if resp.status_code != 200:
        raise Exception(f"MiniMax script error: {resp.status_code} {resp.text[:200]}")

    resp_data = resp.json()
    if use_vision and vision_endpoint == "anthropic":
        # Anthropic 响应：content 是 [{type, text}, ...]
        content = "".join(
            b.get("text", "") for b in resp_data.get("content", []) if b.get("type") == "text"
        ).strip()
    else:
        content = resp_data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
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

    system_prompt = f"""你是 TVC 广告分镜提示词专家。根据以下 TVC 脚本，生成：

1. character_ref_prompt: 主参考图描述（英文，描述核心人物或推广产品外观，用于图片生成，60-100词）
2. scene_ref_prompt: 场景设计图描述（英文，描述整体场景氛围、环境和光影，用于图片生成，60-100词）
3. shots: 每个镜头的 visual_prompt（英文，该镜头的具体动作、运镜和动态描述，30-50词）

风格：{req.style}，模式：{req.mode}

严格返回 JSON：
{{"character_ref_prompt": "...", "scene_ref_prompt": "...", "shots": [{{"visual_prompt": "..."}}]}}

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

    # 优先匹配 JSON 对象 {\"character_ref_prompt\": ..., \"shots\": [...]}
    json_match = re.search(r'\{.*\}', content, re.DOTALL)
    if not json_match:
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
    if not json_match:
        raise Exception("提示词优化返回无法解析的内容")

    try:
        result = json.loads(json_match.group())
        return result
    except json.JSONDecodeError:
        raise Exception("提示词优化返回无效 JSON")


# ==================== Step 3: 分镜头拆分 ====================

def _breakdown_shots(optimized: dict, shot_count: int, shot_duration: int) -> dict:
    character_prompt = optimized.get("character_ref_prompt", "")
    scene_prompt = optimized.get("scene_ref_prompt", "")
    shots = optimized.get("shots", [])
    if len(shots) < shot_count:
        logger.warning(f"分镜头不足：期望 {shot_count}，实际 {len(shots)}，补齐中")
    while len(shots) < shot_count:
        idx = len(shots) + 1
        shots.append({
            "visual_prompt": f"Smooth cinematic transition, shot {idx}, {shot_duration}s",
        })
    shots = shots[:shot_count]
    return {
        "shot_count": shot_count,
        "shot_duration": shot_duration,
        "character_ref_prompt": character_prompt,
        "scene_ref_prompt": scene_prompt,
        "shots": shots,
    }


# ==================== Step 4: 生图（并行） ====================

async def _generate_images_parallel(task_id: str, node_idx: int, breakdown: dict, req, settings, config: dict = None):
    """生成主参考图 + 场景设计图（共 2 张）"""
    state = await workflow_executor.load_task(task_id)
    node = state["nodes"][node_idx]
    subtasks = node.get("subtasks", [])

    cfg = (config or {}).get("step4_image", {})
    image_model = getattr(req, "image_model", None) or cfg.get("default_provider", "gpt-image-2")
    gen_one = get_image_provider(image_model, settings)

    max_retries = 3

    prompt_map = {
        "character-ref": breakdown.get("character_ref_prompt", ""),
        "scene-ref": breakdown.get("scene_ref_prompt", ""),
    }

    async def _process_one(st):
        prompt = prompt_map.get(st["id"], "")
        if not prompt:
            prompt = "High quality cinematic reference image for TVC commercial"
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

    await asyncio.gather(*[_process_one(st) for st in subtasks])
    await workflow_executor.update_node(task_id, node_idx, {"status": "success", "progress": 100})


# ==================== Step 5: 视频生成 ====================

async def _generate_videos(task_id: str, node_idx: int, breakdown: dict, req, settings, config: dict = None, video_model: str = None):
    state = await workflow_executor.load_task(task_id)
    node = state["nodes"][node_idx]
    subtasks = node.get("subtasks", [])

    # 从 Step 4 获取 2 张参考图 URL
    image_node = state["nodes"][node_idx - 1]
    image_subtasks = image_node.get("subtasks", [])
    character_ref_url = ""
    scene_ref_url = ""
    for ist in image_subtasks:
        result = ist.get("result", {})
        url = result.get("image_url", "")
        if url and not url.startswith("placeholder_"):
            if ist["id"] == "character-ref":
                character_ref_url = url
            elif ist["id"] == "scene-ref":
                scene_ref_url = url

    shots = breakdown.get("shots", [])
    video_resolution = getattr(req, "quality", None) or "720p"

    bgm_subtask = next((st for st in subtasks if st["id"] == "bgm"), None)
    bgm_task = None
    if bgm_subtask:
        bgm_task = asyncio.create_task(_generate_bgm(task_id, node_idx, bgm_subtask, req, settings, config))

    submit_fn, provider_name = get_video_provider(video_model or "seedance", settings, resolution=video_resolution)
    video_subtasks = [st for st in subtasks if st["id"] != "bgm"]

    async def _process_video(i: int, st: dict):
        shot_num = i + 1
        first_url = character_ref_url
        last_url = scene_ref_url
        visual_prompt = shots[i].get("visual_prompt", "") if i < len(shots) else ""

        try:
            await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                "status": "running", "progress": 10,
                "message": f"提交{provider_name}视频任务",
            })
            result = await submit_fn(shot_num, first_url, last_url, req.shot_duration, prompt=visual_prompt)
            await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                "status": "success", "progress": 100, "result": result,
            })
            return
        except Exception as e:
            err_msg = str(e)
            is_sensitive = "SensitiveContent" in err_msg or "PrivacyInformation" in err_msg
            logger.warning(f"Video shot {shot_num} failed: {err_msg[:120]}")

            # Seedance 隐私拦截：去掉尾帧只用首帧重试一次
            if is_sensitive and last_url:
                try:
                    logger.info(f"Shot {shot_num}: Seedance sensitive detected, retry with first-frame only")
                    await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                        "status": "running", "progress": 10,
                        "message": "Seedance 首帧重试（去除尾帧）",
                    })
                    result = await submit_fn(shot_num, first_url, "", req.shot_duration, prompt=visual_prompt)
                    await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                        "status": "success", "progress": 100, "result": result,
                    })
                    return
                except Exception as retry_err:
                    err_msg = str(retry_err)
                    logger.warning(f"Shot {shot_num}: first-frame retry also failed: {err_msg[:120]}")

            await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                "status": "error", "progress": 0, "error": err_msg,
            })

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


# ==================== Step 6: 保存资产 ====================

async def _save_assets(task_id: str, user_id, req, breakdown: dict):
    """将生成的参考图、视频、BGM 保存到资产库"""
    from app.database import async_session_maker
    from app.models.asset import Asset

    state = await workflow_executor.load_task(task_id)
    nodes = state.get("nodes", [])

    # Step 4 的 subtasks（参考图）
    image_node = nodes[3]
    image_subtasks = image_node.get("subtasks", [])

    # Step 5 的 subtasks（视频 + BGM）
    video_node = nodes[4]
    video_subtasks = video_node.get("subtasks", [])

    assets_to_save = []

    # 收集参考图
    for st in image_subtasks:
        result = st.get("result", {})
        url = result.get("image_url", "")
        if url and not url.startswith("placeholder_"):
            label = "主参考图" if st["id"] == "character-ref" else "场景设计图"
            assets_to_save.append({
                "type": "image",
                "name": f"TVC_{label}_{task_id}",
                "url": url,
                "category": "tvc",
                "meta": {"source": "tvc_workflow", "task_id": task_id, "ref_type": st["id"]},
            })

    # 收集视频
    for st in video_subtasks:
        if st["id"] == "bgm":
            continue
        result = st.get("result", {})
        url = result.get("video_url", "")
        if url:
            shot_num = st["id"].split("-")[1] if "-" in st["id"] else "0"
            assets_to_save.append({
                "type": "video",
                "name": f"TVC_镜头{shot_num}_{task_id}",
                "url": url,
                "category": "tvc",
                "meta": {"source": "tvc_workflow", "task_id": task_id, "shot_num": int(shot_num)},
            })

    # 收集 BGM
    bgm_subtask = next((st for st in video_subtasks if st["id"] == "bgm"), None)
    if bgm_subtask:
        result = bgm_subtask.get("result", {})
        url = result.get("audio_url", "")
        if url:
            assets_to_save.append({
                "type": "audio",
                "name": f"TVC_BGM_{task_id}",
                "url": url,
                "category": "tvc",
                "meta": {"source": "tvc_workflow", "task_id": task_id, "asset_role": "bgm"},
            })

    if not assets_to_save:
        return

    async with async_session_maker() as db:
        for item in assets_to_save:
            asset = Asset(
                user_id=user_id,
                type=item["type"],
                name=item["name"],
                url=item["url"],
                thumbnail_url=item["url"] if item["type"] == "image" else None,
                category=item["category"],
                meta_data=item["meta"],
            )
            db.add(asset)
        await db.commit()
        logger.info(f"TVC task {task_id}: saved {len(assets_to_save)} assets for user {user_id}")
