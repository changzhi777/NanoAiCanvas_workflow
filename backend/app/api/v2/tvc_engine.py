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
    """预扣积分（团队优先），返回扣除金额（公式与 /tvc-estimate 统一）"""
    from app.services.points_service import calc_tvc_cost, deduct_team_first
    from app.database import async_session_maker

    async with async_session_maker() as db:
        cost = await calc_tvc_cost(db, req.shot_count,
                                   include_acceptance=bool(getattr(req, "acceptance_template_id", None)))
        total = cost["total"]

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

        # 验收模板加载（旁挂审查闸，失败不阻塞主链）
        acceptance_tpl = None
        if getattr(req, "acceptance_template_id", None):
            try:
                from .tvc_acceptance import load_template
                from app.database import async_session_maker
                async with async_session_maker() as _db:
                    acceptance_tpl = await load_template(req.acceptance_template_id, _db)
                if not acceptance_tpl:
                    logger.warning(f"acceptance template {req.acceptance_template_id} not found, gates skipped")
            except Exception as tpl_err:
                logger.warning(f"acceptance template load failed: {tpl_err}")

        # 验收模板驱动的生成参数：竖屏比例 + 计费档
        # ⑤ 横竖版优先级：显式 req.aspect_ratio > 验收模板 > 默认 16:9
        ar = getattr(req, "aspect_ratio", None) or (acceptance_tpl or {}).get("aspect_ratio")
        if ar == "9:16":
            config["_aspect_ratio"] = "9:16"

        # 积分预扣
        if user_id:
            deducted = await deduct_points(user_id, req, force_personal=req.force_personal_points)

        state = await workflow_executor.load_task(task_id)
        state["status"] = "running"
        await workflow_executor._save(task_id, state)
        await workflow_executor._publish(task_id, state)

        # Step 1: 剧本生成 — 有图直接 minimax M3 多模态（图不被浪费）；无图先 GLM 失败 fallback minimax
        await workflow_executor.update_node(task_id, 0, {"status": "running", "progress": 0})
        has_ref_image = bool(getattr(req, "reference_image", None))
        if has_ref_image:
            logger.info("reference_image provided, using MiniMax M3 directly")
            script_result = await _call_minimax_tvc_script(req, settings, config)
        else:
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
        optimized = await _optimize_prompts(script_result, req, settings, config,
                                           task_id=task_id, user_id=str(user_id) if user_id else "",
                                           one_shot_seed=getattr(req, "one_shot_seed", None))
        if not optimized.get("shots"):
            raise Exception("提示词优化返回空结果，无法继续生成分镜头")
        await workflow_executor.update_node(task_id, 1, {
            "status": "success", "progress": 100, "result": optimized,
        })

        # Step 2.5: 剧本验收闸（旁挂——审查失败只标记 unverified，不阻塞）
        script_report_items = None
        if acceptance_tpl:
            try:
                from app.services.acceptance import run_script_gate
                from .tvc_acceptance import save_report
                from app.database import async_session_maker
                gate_report = await run_script_gate(
                    task_id, script_result.get("parsed_script") or {}, acceptance_tpl)
                async with async_session_maker() as _db:
                    await save_report(task_id, "script", gate_report, acceptance_tpl, _db)
                script_report_items = gate_report.get("items") or []
                await workflow_executor.append_review_node(
                    task_id, "step-review-script", "剧本验收审查", gate_report)
                if gate_report.get("status") == "unverified":
                    await _refund_acceptance(user_id)
            except Exception as gate_err:
                logger.warning(f"script gate skipped: {gate_err}")

        # Step 3: 分镜头脚本
        await workflow_executor.update_node(task_id, 2, {"status": "running", "progress": 0})
        breakdown = _breakdown_shots(optimized, req.shot_count, req.shot_duration)
        await workflow_executor.update_node(task_id, 2, {
            "status": "success", "progress": 100, "result": breakdown,
        })

        # Step 4: 生图（真正批量并行）
        await workflow_executor.update_node(task_id, 3, {"status": "running", "progress": 0})
        await _generate_images_parallel(task_id, 3, breakdown, req, settings, config)

        # Step 5: 参考图生视频（minimax 主路 → Seedance 兜底；同 provider 失败不重复）
        await workflow_executor.update_node(task_id, 4, {"status": "running", "progress": 0})
        # 优先级：用户显式 > cfg step5_video default_provider > minimax
        cfg5 = (config or {}).get("step5_video", {})
        user_pick = getattr(req, "video_model", None)
        primary_video_model = user_pick or cfg5.get("default_provider") or "MiniMax-H3"
        try:
            await _generate_videos(task_id, 4, breakdown, req, settings, config, video_model=primary_video_model)
        except Exception as e:
            # 兜底：选与主路不同的 provider（避免重复失败）
            fallback = "seedance" if "minimax" not in primary_video_model.lower() else "MiniMax-H3"
            if fallback == primary_video_model:
                # 主路已是兜底选项，第二次失败用 seedance
                fallback = "seedance"
            logger.warning(f"primary video ({primary_video_model}) failed, fallback to {fallback}: {e}")
            await workflow_executor.update_node(task_id, 4, {"status": "running", "progress": 0})
            await _generate_videos(task_id, 4, breakdown, req, settings, config, video_model=fallback)

        # Step 5.5: SRT 生成 + 字幕烧录（SRT 始终生成入库；烧录按开关）
        voice = getattr(req, "voice_gender", None) or "none"
        if voice != "none":
            try:
                await _burn_subtitles_step(task_id, settings,
                                           burn_enabled=getattr(settings, "TVC_SUBTITLE_BURN", False))
            except Exception as burn_err:
                logger.warning(f"subtitle step failed (degraded to clean): {burn_err}")

        # Step 6: 保存资产到资产库
        if user_id:
            await _save_assets(task_id, user_id, req, breakdown)

        await workflow_executor.complete_task(task_id, "completed")

        # Step 7: 成片验收闸（异步补审——不阻塞 completed 状态）
        if acceptance_tpl:
            asyncio.create_task(_run_final_gate_bg(
                task_id, acceptance_tpl, script_report_items, user_id=user_id))

    except Exception as e:
        # 失败退款
        if deducted > 0 and user_id:
            try:
                await refund_points(user_id, deducted)
                logger.info(f"TVC task {task_id} failed, refunded {deducted} points to user {user_id}")
            except Exception as refund_err:
                logger.error(f"TVC refund failed for task {task_id}: {refund_err}")
        await workflow_executor.fail_task(task_id, str(e))


async def _burn_subtitles_step(task_id: str, settings, burn_enabled: bool = False):
    """Step 5.5：SRT 生成入库（始终）+ 可选烧录（burn_enabled 开关）。

    SRT 无论烧录与否都生成并上传 COS（客户可拿去剪映/PR 后期加工）。
    烧录仅在 burn_enabled=True 时执行（替换视频 URL 为烧录版）。
    """
    import httpx as _httpx
    import os as _os
    import tempfile as _tempfile
    from app.services.srt_generator import generate_srt, burn_subtitles

    async def _upload_cos(local_path: str, key: str) -> str | None:
        """本地文件直传 COS（复用现有配置）"""
        import json as _json
        from qcloud_cos import CosConfig, CosS3Client
        cfg = CosConfig(
            Region=_os.environ.get("COS_REGION", ""),
            SecretId=_os.environ.get("COS_SECRET_ID", ""),
            SecretKey=_os.environ.get("COS_SECRET_KEY", ""),
        )
        client = CosS3Client(cfg)
        bucket = _os.environ.get("COS_BUCKET", "")
        if not bucket:
            return None
        client.upload_file(Bucket=bucket, Key=key, LocalFilePath=local_path)
        base = _os.environ.get("COS_BASE_URL") or f"https://{bucket}.cos.{_os.environ.get('COS_REGION')}.myqcloud.com"
        return f"{base}/{key}"

    state = await workflow_executor.load_task(task_id)
    if not state:
        return

    # 取 srt_entries（step-optimize 的 _one_shot 内）
    srt_entries = []
    video_url = ""
    video_duration = 15.0
    for n in state.get("nodes", []):
        if n.get("id") == "step-optimize":
            one = ((n.get("result") or {}).get("_one_shot")) or {}
            srt_entries = one.get("srt_entries") or []
        if n.get("id") == "step-video":
            for st in n.get("subtasks") or []:
                if st.get("id") == "bgm":
                    continue
                u = ((st.get("result") or {}).get("video_url")) or ""
                if u:
                    video_url = u
                    d = ((st.get("result") or {}).get("duration")) or 15.0
                    video_duration = float(d)

    if not srt_entries:
        logger.info(f"subtitle step skipped: no srt_entries")
        return

    # 生成 SRT（始终执行——无论是否烧录，SRT 文件都入库）
    srt_content = generate_srt(srt_entries, video_duration)
    if not srt_content:
        return

    # SRT 上传 COS（始终）
    srt_tmp = _tempfile.NamedTemporaryFile(mode="w", suffix=".srt", delete=False,
                                            encoding="utf-8")
    srt_tmp.write(srt_content)
    srt_tmp.close()
    try:
        srt_cos = await _upload_cos(srt_tmp.name, f"tvc/{task_id}/sub_zh.srt")
        if srt_cos:
            state = await workflow_executor.load_task(task_id)
            state.setdefault("srt_asset", {})["url"] = srt_cos
            state["srt_asset"]["content"] = srt_content[:2000]
            await workflow_executor._save(task_id, state)
            logger.info(f"SRT uploaded: {srt_cos[:60]}")
    finally:
        _os.unlink(srt_tmp.name)

    # 烧录（仅 burn_enabled=True 时执行）
    if not burn_enabled or not video_url:
        return

    video_tmp = _tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    try:
        async with _httpx.AsyncClient(timeout=120) as client:
            resp = await client.get(video_url)
            video_tmp.write(resp.content)
        video_tmp.close()

        burned_path = await burn_subtitles(video_tmp.name, srt_content)
        logger.info(f"subtitles burned: {burned_path} ({_os.path.getsize(burned_path)//1024}KB)")

        burned_cos = await _upload_cos(burned_path, f"tvc/{task_id}/video_subtitled.mp4")
        if burned_cos:
            state = await workflow_executor.load_task(task_id)
            for n in state.get("nodes", []):
                if n.get("id") == "step-video":
                    for st in n.get("subtasks") or []:
                        if st.get("id") == "bgm":
                            continue
                        if ((st.get("result") or {}).get("video_url")) == video_url:
                            st["result"]["video_url"] = burned_cos
            await workflow_executor._save(task_id, state)
            logger.info(f"video URL updated to burned COS: {burned_cos[:60]}")

    finally:
        _os.unlink(video_tmp.name)


async def _refund_acceptance(user_id):
    """审查 unverified（服务不可用）时退还 acceptance 档积分。"""
    if not user_id:
        return
    try:
        from app.services.points_service import resolve_price
        from app.database import async_session_maker
        async with async_session_maker() as db:
            price = await resolve_price(db, "acceptance_review")
        if price > 0:
            await refund_points(user_id, int(price))
            logger.info(f"acceptance unverified, refunded {price} points to {user_id}")
    except Exception as e:
        logger.warning(f"acceptance refund failed: {e}")


async def _run_final_gate_bg(task_id: str, template: dict, script_items: list | None,
                             user_id=None):
    """成片闸后台任务：从 state 取视频 URL → 抽帧 M3 审查 → 报告落库 + 追加 review 节点。"""
    from app.services.acceptance import run_final_gate
    from .tvc_acceptance import save_report
    from app.database import async_session_maker

    try:
        state = await workflow_executor.load_task(task_id)
        if not state:
            return
        video_url = ""
        parsed_script = {}
        for node in state.get("nodes", []):
            if node.get("id") == "step-video":
                for st in node.get("subtasks") or []:
                    # 排除 BGM 片（5s 氛围镜头）——只审主视频
                    if st.get("id") == "bgm":
                        continue
                    u = ((st.get("result") or {}).get("video_url")) or ""
                    if u:
                        video_url = u
            if node.get("id") == "step-script":
                parsed_script = (node.get("result") or {}).get("parsed_script") or {}
        if not video_url:
            logger.warning(f"final gate skipped: no video_url task={task_id}")
            return

        ref_images = []
        for node in state.get("nodes", []):
            if node.get("id") == "step-images":
                for st in node.get("subtasks") or []:
                    u = (st.get("result") or {}).get("image_url")
                    if u:
                        ref_images.append(u)

        report = await run_final_gate(
            task_id, video_url, parsed_script, template,
            ref_images=ref_images[:2], script_items=script_items)
        async with async_session_maker() as _db:
            await save_report(task_id, "final", report, template, _db)
        await workflow_executor.append_review_node(
            task_id, "step-review-final", "成片验收审查", report)
        if report.get("status") == "unverified":
            await _refund_acceptance(user_id)
        logger.info(f"final gate done task={task_id} status={report.get('status')} score={report.get('score')}")
    except Exception as e:
        logger.warning(f"final gate bg error task={task_id}: {e}")


async def execute_redo(task_id: str, from_step: str, req, user_id=None,
                       acceptance_template_id: str | None = None):
    """单步重做（验收闸不达标后）：只重跑生图或视频(+BGM)，正常计费。

    from_step: images（重跑 step4 生图）/ video（重跑 step5 视频+BGM）
    前置：任务已完成、state 里有请求快照与 breakdown。
    """
    settings = get_settings()
    deducted = 0
    node_idx = 3 if from_step == "images" else 4

    try:
        state = await workflow_executor.load_task(task_id)
        if not state:
            raise Exception("任务不存在")
        breakdown_node = next((n for n in state.get("nodes", []) if n.get("id") == "step-breakdown"), None)
        breakdown = (breakdown_node or {}).get("result") or {}
        if not breakdown.get("shots"):
            raise Exception("无分镜数据，无法单步重做")

        config = await _resolve_tvc_config(user_id, req)

        # 验收模板驱动参数（与主链一致——redo 生图/视频也要竖屏；2026-10-03 横屏回归实证）
        if acceptance_template_id:
            try:
                from .tvc_acceptance import load_template
                from app.database import async_session_maker
                async with async_session_maker() as _db:
                    _tpl = await load_template(acceptance_template_id, _db)
                if _tpl and _tpl.get("aspect_ratio") == "9:16":
                    config["_aspect_ratio"] = "9:16"
            except Exception as tpl_err:
                logger.warning(f"redo template load failed: {tpl_err}")

        # 部分计费：images → image 档；video → video+BGM 档
        from app.services.points_service import calc_tvc_cost, deduct_team_first
        from app.database import async_session_maker
        async with async_session_maker() as db:
            cost = await calc_tvc_cost(db, req.shot_count)
            part = cost["image"] if from_step == "images" else (cost["video"] + cost["bgm"])
            if user_id:
                await deduct_team_first(db, user_id, part,
                                        description=f"TVC 单步重做-{from_step}",
                                        force_personal=getattr(req, "force_personal_points", False))
        deducted = part if user_id else 0

        # 重置目标节点
        await workflow_executor.update_node(task_id, node_idx, {"status": "running", "progress": 0, "error": None})
        state = await workflow_executor.load_task(task_id)
        state["status"] = "running"
        await workflow_executor._save(task_id, state)
        await workflow_executor._publish(task_id, state)

        if from_step == "images":
            await _generate_images_parallel(task_id, node_idx, breakdown, req, settings, config)
        else:
            cfg5 = (config or {}).get("step5_video", {})
            primary = getattr(req, "video_model", None) or cfg5.get("default_provider") or "MiniMax-H3"
            try:
                await _generate_videos(task_id, node_idx, breakdown, req, settings, config, video_model=primary)
            except Exception as e:
                fallback = "seedance" if "minimax" not in primary.lower() else "MiniMax-H3"
                logger.warning(f"redo video primary ({primary}) failed, fallback {fallback}: {e}")
                await workflow_executor.update_node(task_id, node_idx, {"status": "running", "progress": 0})
                await _generate_videos(task_id, node_idx, breakdown, req, settings, config, video_model=fallback)

        # 刷新下游资产（视频重做后产物变化）
        if user_id and from_step == "video":
            try:
                await _save_assets(task_id, user_id, req, breakdown)
            except Exception as asset_err:
                logger.warning(f"redo asset save failed: {asset_err}")

        await workflow_executor.complete_task(task_id, "completed")

        # 重跑成片闸
        if acceptance_template_id:
            try:
                from .tvc_acceptance import load_template
                async with async_session_maker() as _db:
                    tpl = await load_template(acceptance_template_id, _db)
                if tpl:
                    asyncio.create_task(_run_final_gate_bg(task_id, tpl, None, user_id=user_id))
            except Exception as gate_err:
                logger.warning(f"redo final gate skipped: {gate_err}")

    except Exception as e:
        if deducted > 0 and user_id:
            try:
                await refund_points(user_id, deducted)
            except Exception as refund_err:
                logger.error(f"redo refund failed task={task_id}: {refund_err}")
        await workflow_executor.fail_task(task_id, f"重做失败: {e}")


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

    model_map = {"tvc_deep": "glm-5.3", "tvc_fast": "glm-5.3-flash", "tvc_vision": "glm-5v-turbo"}
    model = cfg.get("model") or model_map.get(req.optimize_mode, "glm-5.3")

    # 走 _glm_chat helper（Anthropic 协议 + thinking 自动开）
    from .glm_proxy import _glm_chat
    data = await _glm_chat(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请生成以下TVC广告的结构化脚本：\n{req.prompt}"},
        ],
        temperature=cfg.get("temperature", 1.0 if is_thinking else 0.7),
        max_tokens=cfg.get("max_tokens", 8192),
    )

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

    def _try_parse(js):
        if not js:
            return {}
        try:
            return json.loads(js)
        except json.JSONDecodeError:
            try:
                return json.loads(_repair_json(js))
            except json.JSONDecodeError:
                return {}

    script = _try_parse(json_str)
    if not script.get("shots"):
        # content 截断/异常兜底：thinking 模型偶发把完整 JSON 写进 reasoning_content
        # （2026-10-03 法风烧饼单实证：content 仅 48 字 `<output>{` 开头）
        rc = msg.get("reasoning_content", "").strip()
        if rc:
            rc_json = None
            m2 = re.search(r"<output>([\s\S]*?)</output>", rc)
            if m2:
                rc_json = _find_balanced(m2.group(1), '{', '}')
            if not rc_json:
                rc_json = _find_balanced(rc, '{', '}')
            cand = _try_parse(rc_json)
            if cand.get("shots"):
                logger.warning(f"GLM script content truncated ({len(content)} chars), recovered from reasoning_content ({len(rc)} chars)")
                script = cand
                if len(content) < len(rc):
                    content = rc

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


def _build_minimax_image_block(image: str, source_type: str = "anthropic") -> dict:
    """构造 minimax 视觉端点的 image block。

    source_type=anthropic → {type: image, source: {type: base64|url, media_type, data|url}}
    source_type=openai    → {type: image_url, image_url: {url, ...}}
    """
    if source_type == "openai":
        # OpenAI 兼容：image_url 必须包 data URI 或 URL
        return {"type": "image_url", "image_url": {"url": _to_data_uri(image)}}
    # anthropic 兼容：data URI / URL 自适应
    mime = _sniff_image_mime(image)
    if image.startswith("data:") or not image.startswith("http"):
        b64 = image.split(",", 1)[1] if image.startswith("data:") else image
        return {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}}
    return {"type": "image", "source": {"type": "url", "url": image}}


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
                    _build_minimax_image_block(image, source_type="anthropic"),
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
        # minimax Anthropic 兼容端点 — system 走顶层 field，image 走 image source
        if image_uri.startswith("data:") or not image_uri.startswith("http"):
            # base64 data URI 或裸 base64 → 内嵌
            image_block = {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": _sniff_image_mime(image_uri) or "image/jpeg",
                    "data": image_uri.split(",", 1)[1] if image_uri.startswith("data:") else image_uri,
                },
            }
        else:
            # http/https URL → 用 url source（Anthropic API 支持）
            image_block = {
                "type": "image",
                "source": {"type": "url", "url": image_uri},
            }
        api_params = {
            "model": model,
            "system": system_prompt,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": text_block},
                    image_block,
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

async def _optimize_prompts(script_result: dict, req, settings, config: dict = None,
                         task_id: str = "", user_id: str = "", one_shot_seed: str = None) -> dict:
    raw = script_result.get("raw_content", "")
    cfg = (config or {}).get("step2_optimize", {})

    # ===== 一镜到底模式：shot_count=1 走单段 15s 长镜头模板 =====
    if getattr(req, "shot_count", 1) == 1:
        from app.services.one_shot_prompt import generate as one_shot_generate
        from app.database import async_session_maker
        from app.services.one_shot_prompt import log_action

        # seed 优先级：显式 one_shot_seed（"再生成一次"）> 上次任务产物 > None（随机）
        prev_seed = one_shot_seed
        if not prev_seed:
            try:
                state = await workflow_executor.load_task(task_id) if task_id else None
                if state:
                    for node in state.get("nodes", []):
                        if node.get("id") == "step-optimize":
                            one = (node.get("result") or {}).get("_one_shot") or {}
                            prev_seed = one.get("composition_seed")
                            break
            except Exception:
                pass

        async with async_session_maker() as db:
            # ===== 提示词审查层 1：干净的产品描述 =====
            # 从结构化剧本提取（logline + 角色描述），不用 raw——raw 前段是 JSON 开头，
            # 直接截取会把 JSON 片段混进视觉 prompt（污染生图，出无关图）
            parsed_script = script_result.get("parsed_script")
            clean_desc = ""
            if isinstance(parsed_script, dict):
                parts = [str(parsed_script.get("logline") or "")]
                for c in (parsed_script.get("characters") or [])[:3]:
                    d = (c.get("description") or "").strip()
                    if d:
                        parts.append(d)
                clean_desc = " ".join(p for p in parts if p)[:500]
            subject_desc = clean_desc or raw[:500]

            one = await one_shot_generate(
                subject_desc=subject_desc,
                object_desc=getattr(req, "style_reference", "") or "",
                task_id=task_id,
                user_id=user_id,
                db=db,
                prev_seed=prev_seed,
            )

            # ===== 提示词审查层 2：JSON/剧本内容泄漏检测 =====
            vp = one.get("prompt", "")
            polluted = any(t in vp for t in ("{", "}", '"tvc_title"', "<output>", "characters"))
            if polluted:
                user_prompt = (getattr(req, "prompt", "") or "")[:400]
                logger.warning(f"one-shot prompt polluted (JSON leak), regen with user anchor: {user_prompt[:80]}")
                one = await one_shot_generate(
                    subject_desc=user_prompt or subject_desc,
                    object_desc=getattr(req, "style_reference", "") or "",
                    task_id=task_id,
                    user_id=user_id,
                    db=db,
                    prev_seed=prev_seed,
                )
                vp = one.get("prompt", "")

            # ===== 提示词层 2.5：H3 结构化 Schema 编译（五锚点主控，TVC_H3_SCHEMA_PROMPT 开关可回滚） =====
            if getattr(settings, "TVC_H3_SCHEMA_PROMPT", True):
                try:
                    from app.services.h3_prompt import compile_h3_prompt
                    ps = script_result.get("parsed_script") or {}
                    narration_txt = str(ps.get("narration") or "")
                    dlg_txt = ""
                    for _s in ps.get("shots") or []:
                        for _d in _s.get("dialogue") or []:
                            dlg_txt = str(_d.get("line") or "")
                            break
                        if dlg_txt:
                            break
                    bgm_cfg = (config or {}).get("step5_bgm", {})

                    # 五锚点 V5：从 req.prompt 提取 [镜头N] 分段 → 多镜头时间轴
                    # （客户意见"镜头单调没按情节"——Brief 情节分段直接映射 H3 [Shot N] 协议）
                    # 台词提取：分段内 配音：'…' / 说：'…' / 配音+字幕：'…'
                    import re as _re
                    story_shots = []
                    user_prompt = getattr(req, "prompt", "") or ""
                    segs = _re.split(r"\[镜头(\d)\]", user_prompt)
                    if len(segs) >= 3:
                        for i in range(1, len(segs) - 1, 2):
                            seg_visual = segs[i + 1].strip()
                            if not seg_visual:
                                continue
                            m_line = _re.search(
                                r"(?:配音\+?字幕|配音|旁白|台词|说)[：:]?\s*'([^']+)'", seg_visual)
                            seg_line = m_line.group(1).strip() if m_line else ""
                            story_shots.append({"visual": seg_visual[:300],
                                                "line": seg_line[:120]})
                    story_shots = story_shots[:4]  # 15s 上限 4 镜头

                    # M4：剧本 dialogue_timeline 时间轴注入（DS4 输出的精确时间为权威源）
                    _dtl = (script_result.get("parsed_script") or {}).get("dialogue_timeline") or []
                    if _dtl:
                        for j, sh in enumerate(story_shots):
                            if j < len(_dtl):
                                sh["start"] = float(_dtl[j].get("start", 0))
                                sh["end"] = float(_dtl[j].get("end", 0))
                        logger.info(f"dialogue_timeline injected: {len(_dtl)} entries")

                    compiled = compile_h3_prompt(
                        character_desc=getattr(req, "character_desc", "") or subject_desc[:200],
                        product_name=getattr(req, "product_name_desc", "") or "",
                        product_sell=getattr(req, "product_sell", "") or "",
                        product_price=getattr(req, "product_price", "") or "",
                        scene_desc=str(ps.get("logline") or "")[:200] or (getattr(req, "prompt", "") or "")[:160],
                        camera_movement=getattr(req, "camera_movement", None),
                        light_style=getattr(req, "light_style", None),
                        narration=narration_txt[:120],
                        dialogue=dlg_txt[:120],
                        bgm_prompt=str(bgm_cfg.get("prompt") or ""),
                        style_word="3D CG",
                        duration=int(one.get("duration") or 15),
                        voice_gender=getattr(req, "voice_gender", "none") or "none",
                        voice_preset=getattr(req, "voice_preset", None),
                        story_shots=story_shots or None,
                    )
                    one["prompt"] = compiled["prompt"]
                    one["h3_voice"] = compiled["voice"]["id"] if compiled.get("voice") else None
                    one["srt_entries"] = compiled.get("srt_entries", [])  # 🆕 字幕条目（同源）
                    logger.info(f"H3 schema prompt compiled: voice={one.get('h3_voice')} shots={compiled['shots']} srt={len(one['srt_entries'])}")
                except Exception as h3_err:
                    logger.warning(f"H3 schema compile failed, fallback legacy prompt: {h3_err}")

            # ===== 提示词审查层 3：广告主题锚点 =====
            # 视觉 prompt 末尾追加用户创意锚点（取 req.prompt 前 80 字），
            # 确保生图/视频模型始终关联广告主题（产品词/品牌词/风格词）
            # H3 Schema 模式跳过——编译器已含产品/场景锚，尾部追加会破坏 schema（music 字段后缀）
            h3_schema_used = "integrated_multimodal_description:" in one.get("prompt", "")
            anchor = (getattr(req, "prompt", "") or "")[:80].strip()
            if anchor and anchor not in vp and not h3_schema_used:
                one["prompt"] = f"{vp} Ad theme anchor: {anchor}"

            await log_action(
                db, task_id=task_id, user_id=user_id,
                narrative=one["narrative"], composition=one["composition"],
                action="shown",
            )
            shots = [{"visual_prompt": one["prompt"], "duration": one["duration"]}]
            # 参考图 prompt = 主体静态描述 + anchor（不能用运动 prompt 截断——
            # 模板动作文案("The subject sits in a void...")无主体细节且 [:200] 会截掉尾部 anchor，
            # 生图模型收到纯运动描述 → 参考图跑题（Bug#7 同源，2026-10-02 法风烧饼单复发实证）
            if h3_schema_used:
                # Schema 模式：五锚点字段直拼（角色+产品+anchor），不经运动模板
                ref_parts = [
                    "Commercial advertising reference image, high detail.",
                    getattr(req, "character_desc", "") or "",
                    getattr(req, "product_name_desc", "") or "",
                    getattr(req, "product_sell", "") or "",
                    f"Ad theme anchor: {anchor}" if anchor else "",
                ]
            else:
                ref_parts = [
                    "Commercial advertising reference image, high detail.",
                    str(one.get("subject_desc") or "").strip(),
                    str(one.get("object_desc") or "").strip(),
                    f"Ad theme anchor: {anchor}" if anchor else "",
                ]
            ref_prompt = " ".join(p for p in ref_parts if p).strip() or one["prompt"][:400]
            return {
                "character_ref_prompt": ref_prompt[:800],
                "scene_ref_prompt": ref_prompt[:800],
                "shots": shots,
                "_one_shot": one,
            }

    system_prompt = f"""你是 TVC 广告分镜提示词专家。根据以下 TVC 脚本，生成：

1. character_ref_prompt: 主参考图描述（英文，描述核心人物或推广产品外观，用于图片生成，60-100词）
2. scene_ref_prompt: 场景设计图描述（英文，描述整体场景氛围、环境和光影，用于图片生成，60-100词）
3. shots: 每个镜头的 visual_prompt（英文，该镜头的具体动作、运镜和动态描述，30-50词）

风格：{req.style}，模式：{req.mode}

严格返回 JSON：
{{"character_ref_prompt": "...", "scene_ref_prompt": "...", "shots": [{{"visual_prompt": "..."}}]}}

只返回 JSON，不要其他内容。"""

    # 走 _glm_chat helper（Anthropic 协议 + thinking 自动开）
    from .glm_proxy import _glm_chat
    data = await _glm_chat(
        model=cfg.get("model", "glm-4.5-air"),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw},
        ],
        temperature=cfg.get("temperature", 0.7),
        max_tokens=cfg.get("max_tokens", 4096),
    )
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

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
    image_model = getattr(req, "image_model", None) or cfg.get("default_provider", "gpt-image-2.5-flare")
    # 竖屏 + 产品参照图（验收模板驱动；P0#1 productImage 修复）
    aspect = (config or {}).get("_aspect_ratio") or "1280*720"
    aspect = "720*1280" if aspect == "9:16" else "1280*720"
    product_ref = getattr(req, "product_image", None) or None
    gen_one = get_image_provider(image_model, settings, enhance_cfg=cfg.get("prompt_enhance"),
                                 aspect_ratio=aspect, product_ref_url=product_ref)

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
        bgm_task = asyncio.create_task(_generate_h3_bgm(task_id, node_idx, bgm_subtask, req, settings, config))

    submit_fn, provider_name = get_video_provider(
        video_model or "seedance", settings, resolution=video_resolution,
        ratio="9:16" if (config or {}).get("_aspect_ratio") == "9:16" else "16:9")
    video_subtasks = [st for st in subtasks if st["id"] != "bgm"]

    async def _process_video(i: int, st: dict):
        shot_num = i + 1
        first_url = character_ref_url
        # 尾帧：显式 KV 图（五锚点尾帧融合）优先，否则场景图
        last_url = getattr(req, "last_frame_url", None) or scene_ref_url
        visual_prompt = shots[i].get("visual_prompt", "") if i < len(shots) else ""

        try:
            await workflow_executor.update_subtask(task_id, node_idx, st["id"], {
                "status": "running", "progress": 10,
                "message": f"提交{provider_name}视频任务",
            })
            result = await submit_fn(shot_num, first_url, last_url, req.shot_duration, prompt=visual_prompt)
            result["provider"] = provider_name  # 实际通道（MiniMax Official / MiniMax H3 / Seedance）
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

    # 若所有 video subtask 都失败，标 failed（避免掩盖总失败）
    final_state = await workflow_executor.load_task(task_id)
    final_video_subtasks = [st for st in final_state["nodes"][node_idx].get("subtasks", []) if st["id"] != "bgm"]
    has_success = any(st.get("status") == "success" for st in final_video_subtasks)
    if final_video_subtasks and not has_success:
        await workflow_executor.update_node(task_id, node_idx, {
            "status": "failed", "progress": 0, "error": "All video providers failed (H3 + Seedance)",
        })
        raise Exception("All video providers failed")
    await workflow_executor.update_node(task_id, node_idx, {"status": "success", "progress": 100})


async def _generate_h3_bgm(task_id: str, node_idx: int, subtask: dict, req, settings, config: dict = None):
    """BGM 用 MiniMax H3 视频通道生成带音频的氛围镜头（替代废弃的 MiniMax Music）。

    复用 _submit_video_minimax（速创 MiniMax H3）—— 与 step5_video 同通道，积分自动一致。
    prompt 三层来源：step5_bgm.prompt > req.bgm_prompt > req.prompt 推断
    duration 默认 5s（range 4-15）"""
    bgm_cfg = (config or {}).get("step5_bgm", {})
    base_duration = bgm_cfg.get("duration", 5)
    bgm_duration = max(4, min(15, int(base_duration)))  # H3 范围 4-15s

    # prompt 三层优先级
    custom_prompt = bgm_cfg.get("prompt") or getattr(req, "bgm_prompt", None) or ""
    if custom_prompt:
        bgm_prompt = f"TVC广告氛围镜头，{req.mode}风格，{bgm_duration}秒，{custom_prompt}。无对话，无人物特写"
    else:
        # 兜底：从 req.prompt 推断场景情绪
        bgm_prompt = (
            f"TVC广告氛围镜头，{req.mode}风格，{req.total_duration}秒，"
            f"配合创意\"{req.prompt[:120]}\"。无对话，无人物特写"
        )

    await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
        "status": "running", "progress": 10, "message": f"MiniMax H3 生成 BGM 氛围镜头中 ({bgm_duration}s)",
    })

    try:
        # 复用 H3 视频通道（与主视频同速创 MiniMax H3；比例跟随主片）
        submit_fn, provider_name = get_video_provider(
            "minimax-h3", settings, resolution="768P",
            ratio="9:16" if (config or {}).get("_aspect_ratio") == "9:16" else "16:9"
        )

        # 找场景图作为首帧（已有 character-ref/scene-ref 的实际 URL），
        # 无则用公开占位图兜底（_submit_video_minimax 强制 first_url 非空）
        first_frame_url = "https://placehold.co/600x400/png"  # safe fallback: 任何 TVC 流程都可达
        for node in (state if "state" in dir() else []):
            pass
        # 简化：查 Redis state 取 step4 的 scene-ref URL
        try:
            persisted = await workflow_executor.load_task(task_id)
            for node in (persisted.get("nodes") or []):
                if node.get("id") == "step-images":
                    for st in node.get("subtasks") or []:
                        if st.get("id") == "scene-ref":
                            r = st.get("result") or {}
                            u = r.get("image_url", "")
                            if u and not u.startswith("placeholder_"):
                                first_frame_url = u
                                break
        except Exception:
            pass

        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "running", "progress": 30, "message": "提交 H3 任务",
        })

        result = await submit_fn(
            shot_num=0,  # BGM 用 0 占位（不影响主视频编号）
            first_url=first_frame_url,
            last_url="",
            duration=bgm_duration,
            prompt=bgm_prompt,
        )

        video_url = result.get("video_url", "")
        if not video_url:
            raise Exception(f"H3 BGM returned no video_url: {result}")

        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "success", "progress": 100,
            "result": {
                "video_url": video_url,
                "audio_url": video_url,  # 双标记兼容前端 audio 播放器
                "provider_task_id": result.get("provider_task_id"),
                "provider": provider_name,
                "duration": bgm_duration,
            },
        })
    except asyncio.CancelledError:
        await workflow_executor.update_subtask(task_id, node_idx, subtask["id"], {
            "status": "error", "progress": 0, "error": "BGM generation was cancelled",
        })
        raise
    except Exception as e:
        error_msg = str(e) or repr(e) or "Unknown H3 BGM error"
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

    # 收集 BGM（H3 视频通道产出视频+音频双轨 → 资产 type=video 兼容前端 audio/video 播放器）
    bgm_subtask = next((st for st in video_subtasks if st["id"] == "bgm"), None)
    if bgm_subtask:
        result = bgm_subtask.get("result", {})
        url = result.get("video_url") or result.get("audio_url", "")
        if url:
            assets_to_save.append({
                "type": "video",  # MiniMax Music 已废弃；BGM 现走 H3 视频档，type=video 语义更准
                "name": f"TVC_BGM_{task_id}",
                "url": url,
                "category": "tvc",
                "meta": {"source": "tvc_workflow", "task_id": task_id, "asset_role": "bgm", "provider": result.get("provider", "MiniMax H3")},
            })

    # 收集剧本（text 资产：url 用 text:// 占位，不经 COS 转存）
    script_node = nodes[0]
    script_result = script_node.get("result", {}) or {}
    parsed_script = script_result.get("parsed_script")
    if parsed_script:
        script_text = parsed_script if isinstance(parsed_script, str) else json.dumps(
            parsed_script, ensure_ascii=False
        )
        assets_to_save.append({
            "type": "text",
            "name": f"TVC_脚本_{task_id}",
            "url": f"text://{task_id}/script",
            "category": "tvc-script",
            "meta": {
                "source": "tvc_workflow",
                "task_id": task_id,
                "asset_role": "script",
                "script": parsed_script,
            },
            "skip_transfer": True,
        })

    if not assets_to_save:
        return

    # 转存：COS 优先 → 本地 asset-uploads 降级（修复速创临时外链 404 问题）
    from app.services.cos_upload import transfer_with_fallback

    async with async_session_maker() as db:
        for item in assets_to_save:
            if item.get("skip_transfer"):
                # text 资产：url 是 text:// 占位，内容在 meta.script，不经 COS
                url = item["url"]
            else:
                url = await transfer_with_fallback(
                    item["url"],
                    key_hint=f"tvc/{task_id}/{item['name']}",
                    asset_type=item["type"],
                )
            asset = Asset(
                user_id=user_id,
                type=item["type"],
                name=item["name"],
                url=url,
                thumbnail_url=url if item["type"] == "image" else None,
                category=item["category"],
                meta_data=item["meta"],
            )
            db.add(asset)
        await db.commit()
        logger.info(f"TVC task {task_id}: saved {len(assets_to_save)} assets for user {user_id}")


# BPM 推荐与声音混音端点已迁移到 workflow_tasks.py（保持 router 一致性）
