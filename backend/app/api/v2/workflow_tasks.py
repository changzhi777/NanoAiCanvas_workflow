"""
TVC 工作流任务 API（路由层）
- POST /api/v2/tvc-tasks/submit   提交任务
- GET  /api/v2/tvc-tasks/{id}     查询状态
- POST /api/v2/tvc-tasks/{id}/cancel  取消任务
- GET  /api/v2/tvc-tasks/{id}/progress SSE 实时进度流
"""
import json
import asyncio
import uuid

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.api.auth import get_current_user_optional
from app.models import User
from app.services import workflow_executor
from .tvc_engine import execute_tvc

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
    image_model: str = "gpt-image-2"
    video_model: str = "seedance"
    style_reference: Optional[str] = None
    reference_image: Optional[str] = None
    # 用户级模型覆盖（来自属性面板）
    script_model: Optional[str] = None
    optimize_model: Optional[str] = None
    bgm_model: Optional[str] = None
    quality: Optional[str] = None
    # Seedance 2.0 提示词增强参数
    camera_movement: Optional[str] = None
    light_style: Optional[str] = None
    negative_prompts: Optional[list[str]] = None
    force_personal_points: bool = False  # 团队不足时确认用个人积分


@router.post("/submit")
async def submit_task(
    req: SubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """提交 TVC 工作流任务"""
    # 积分预检（仅检查余额，实际扣减在引擎中）
    if current_user:
        try:
            from app.services.points_service import node_type_to_model_type, resolve_price, get_user_team, get_team_account, get_or_create_account
            from app.database import async_session_maker

            async with async_session_maker() as db:
                text_price = await resolve_price(db, node_type_to_model_type("script_generator"))
                image_price = await resolve_price(db, node_type_to_model_type("storyboard_generator"))
                video_price = await resolve_price(db, node_type_to_model_type("storyboard_video"))
                bgm_price = await resolve_price(db, node_type_to_model_type("background_music"))

                total = text_price * 3 + image_price * 2 + video_price * req.shot_count + bgm_price

                # 团队优先检查
                team_id = await get_user_team(db, current_user.id)
                if team_id:
                    team_account = await get_team_account(db, team_id)
                    if team_account and team_account.balance >= total:
                        pass  # 团队余额充足
                    elif not req.force_personal_points:
                        team_bal = team_account.balance if team_account else 0
                        raise HTTPException(
                            status_code=402,
                            detail=f"团队积分不足(余额{team_bal})，需要{total}。是否使用个人积分支付？",
                            headers={"X-Insufficient-Balance": "true", "X-Team-Insufficient": "true"},
                        )
                    else:
                        # 用户确认用个人积分
                        account = await get_or_create_account(db, current_user.id)
                        if account.balance < total:
                            raise HTTPException(
                                status_code=402,
                                detail=f"个人积分不足，需要 {total}，当前余额 {account.balance}",
                                headers={"X-Insufficient-Balance": "true"},
                            )
                else:
                    account = await get_or_create_account(db, current_user.id)
                    if account.balance < total:
                        raise HTTPException(
                            status_code=402,
                            detail=f"积分不足，需要 {total}，当前余额 {account.balance}",
                            headers={"X-Insufficient-Balance": "true"},
                        )
        except HTTPException:
            raise
        except Exception:
            pass

    task_id = f"tvc_{uuid.uuid4().hex[:12]}"
    nodes = _build_nodes(req)
    await workflow_executor.create_task(task_id, req.workflow_id, nodes)

    user_id = current_user.id if current_user else None
    asyncio.create_task(execute_tvc(task_id, req, user_id))

    return {"task_id": task_id, "status": "submitted"}


def _build_nodes(req: SubmitRequest) -> list:
    return [
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
            "label": "参考图生成",
            "type": "images",
            "status": "pending",
            "progress": 0,
            "subtasks": [
                {"id": "character-ref", "label": "主参考图（人物/产品）", "status": "pending", "progress": 0},
                {"id": "scene-ref", "label": "场景设计图", "status": "pending", "progress": 0},
            ],
        },
        {
            "id": "step-video",
            "label": "参考图生视频",
            "type": "video",
            "status": "pending",
            "progress": 0,
            "subtasks": [
                {"id": f"shot-{i+1}-video", "label": f"镜头 {i+1}/{req.shot_count}: 视频", "status": "pending", "progress": 0}
                for i in range(req.shot_count)
            ] + [
                {"id": "bgm", "label": "BGM 生成", "status": "pending", "progress": 0}
            ],
        },
    ]


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
            state = await workflow_executor.load_task(task_id)
            if state:
                yield f"data: {json.dumps(state, ensure_ascii=False)}\n\n"

            last_ping = asyncio.get_event_loop().time()
            while True:
                message = await pubsub.get_message(timeout=30)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    yield f"data: {data}\n\n"

                    try:
                        parsed = json.loads(data)
                        if parsed.get("status") in ("completed", "failed", "cancelled"):
                            break
                    except json.JSONDecodeError:
                        pass

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


# ==================== FFmpeg 视频合成 ====================

import os
import tempfile
import subprocess
import logging

logger = logging.getLogger(__name__)


class ComposeRequest(BaseModel):
    video_urls: list[str]
    bgm_url: Optional[str] = None
    bgm_volume: float = 0.3
    bgm_fade_in: float = 1.0    # BGM 淡入秒数
    bgm_fade_out: float = 1.5   # BGM 淡出秒数
    transition: str = "fade"    # cut/fade/dissolve/wipeleft/...（映射见 video_compose.XFADE_MAP）
    fade_duration: float = 0.5  # 转场时长（秒）
    resolution: str = "720p"    # 720p/1080p/480p/2k/"all"（all=双档 720p+1080p）
    quality: str = "standard"   # high/standard/draft（crf 18/23/28）
    output_format: str = "mp4"
    subtitles: Optional[list[dict]] = None  # [{"text": str, "start": float, "end": float}]


@router.post("/compose")
async def compose_tvc_video(
    req: ComposeRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """FFmpeg 合成：转场拼接 + BGM（fade/loudnorm）+ 字幕 + 多规格 → 完整 TVC

    实现委托给 app.services.video_compose.compose_pipeline（可单测的纯函数 filter 构建）。
    """
    import httpx
    import shutil
    from app.services.video_compose import ComposeOptions, compose_pipeline

    if not req.video_urls:
        raise HTTPException(status_code=400, detail="至少需要一个视频")

    with tempfile.TemporaryDirectory() as tmpdir:
        # 1. 下载所有视频
        video_files: list[str] = []
        async with httpx.AsyncClient(timeout=120) as http:
            for i, url in enumerate(req.video_urls):
                path = os.path.join(tmpdir, f"shot_{i:03d}.mp4")
                try:
                    resp = await http.get(url)
                    resp.raise_for_status()
                    with open(path, "wb") as f:
                        f.write(resp.content)
                    video_files.append(path)
                except Exception as e:
                    logger.error(f"下载视频 {i+1} 失败: {e}")
                    raise HTTPException(status_code=502, detail=f"视频 {i+1} 下载失败: {e}")

        if not video_files:
            raise HTTPException(status_code=502, detail="所有视频下载失败")

        # 2. 下载 BGM（失败仅警告，不阻断）
        bgm_path: Optional[str] = None
        if req.bgm_url:
            bgm_path = os.path.join(tmpdir, "bgm.mp3")
            try:
                async with httpx.AsyncClient(timeout=60) as http:
                    resp = await http.get(req.bgm_url)
                    resp.raise_for_status()
                    with open(bgm_path, "wb") as f:
                        f.write(resp.content)
            except Exception as e:
                logger.warning(f"BGM 下载失败，跳过混音: {e}")
                bgm_path = None

        # 3. 合成管线（normalize → xfade/concat → BGM → 字幕 → 多规格）
        opts = ComposeOptions(
            resolution=req.resolution,
            quality=req.quality,
            transition=req.transition,
            fade_duration=req.fade_duration,
            bgm_volume=req.bgm_volume,
            bgm_fade_in=req.bgm_fade_in,
            bgm_fade_out=req.bgm_fade_out,
            output_format=req.output_format,
        )
        try:
            result = await compose_pipeline(
                video_files, tmpdir, opts, bgm_path=bgm_path, subtitles=req.subtitles
            )
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))

        # 4. 保存各档输出到 asset-uploads（复用 image_downloader 的路径常量，env 优先）
        from app.services.image_downloader import ASSET_UPLOAD_DIR as upload_base
        os.makedirs(upload_base, exist_ok=True)
        outputs_url: dict[str, str] = {}
        for label, path in result.outputs.items():
            filename = f"tvc_{uuid.uuid4().hex[:8]}_{label}.{req.output_format}"
            shutil.copy2(path, os.path.join(upload_base, filename))
            outputs_url[label] = f"/asset-uploads/{filename}"

        # 向后兼容：url 字段返回主档
        main_url = outputs_url.get(req.resolution) or next(iter(outputs_url.values()), "")
        return {"url": main_url, "outputs": outputs_url, "duration": result.duration}


# ==================== 一镜到底辅助端点（C2）====================

class MixAudioRequest(BaseModel):
    ambient_urls: list[str] = []
    bgm_url: str
    ambient_volume: float = 0.3


@router.post("/{task_id}/recommend-bpm")
async def recommend_bpm(task_id: str, current_user: Optional[User] = Depends(get_current_user_optional)):
    """视频生成后：按时长推算动作密度 → 推荐 BGM BPM。"""
    from app.services.video_compose import probe_duration
    state = await workflow_executor.load_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    video_node = next((n for n in state.get("nodes", []) if n.get("type") == "video"), None)
    if not video_node:
        raise HTTPException(status_code=400, detail="视频节点未生成")

    # 取本地视频
    from app.services.image_downloader import ASSET_UPLOAD_DIR
    local_path = None
    for st in video_node.get("subtasks", []):
        u = (st.get("result") or {}).get("video_url", "")
        if u.startswith("/asset-uploads/"):
            local_path = os.path.join(ASSET_UPLOAD_DIR, u.split("/")[-1])
            break

    duration = 0.0
    if local_path and os.path.exists(local_path):
        duration = await asyncio.to_thread(probe_duration, local_path)

    if duration <= 0:
        bpm, confidence = 100, "low"
    elif duration < 8:
        bpm, confidence = 90, "high"
    elif duration < 13:
        bpm, confidence = 110, "high"
    else:
        bpm, confidence = 80, "mid"
    return {"task_id": task_id, "bpm_hint": bpm, "confidence": confidence, "duration": duration}


@router.post("/{task_id}/mix-audio")
async def mix_audio(task_id: str, req: MixAudioRequest, current_user: Optional[User] = Depends(get_current_user_optional)):
    """H3 出片后 ffmpeg mix ambient + BGM → 本地 asset-uploads URL。"""
    import shutil
    state = await workflow_executor.load_task(task_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")

    from app.services.image_downloader import ASSET_UPLOAD_DIR
    video_url = None
    for n in state.get("nodes", []):
        if n.get("type") == "video":
            for st in n.get("subtasks", []):
                u = (st.get("result") or {}).get("video_url", "")
                if u.startswith("/asset-uploads/"):
                    video_url = u
                    break
        if video_url:
            break
    if not video_url:
        raise HTTPException(status_code=400, detail="视频未本地化或不存在")
    video_path = os.path.join(ASSET_UPLOAD_DIR, video_url.split("/")[-1])
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"视频文件不存在: {video_path}")

    with tempfile.TemporaryDirectory() as tmpdir:
        async with httpx.AsyncClient(timeout=120) as client:
            local_ambient = []
            for i, u in enumerate(req.ambient_urls or []):
                p = os.path.join(tmpdir, f"amb_{i}.mp3")
                r = await client.get(u); r.raise_for_status()
                with open(p, "wb") as f: f.write(r.content)
                local_ambient.append(p)
            bgm_path = os.path.join(tmpdir, "bgm.mp3")
            r = await client.get(req.bgm_url); r.raise_for_status()
            with open(bgm_path, "wb") as f: f.write(r.content)

        out_path = os.path.join(tmpdir, "mixed.mp4")
        loop = asyncio.get_running_loop()

        def _mix():
            inputs = ["-y", "-i", video_path]
            for ap in local_ambient:
                inputs += ["-i", ap]
            inputs += ["-i", bgm_path]
            amb_filter = "".join(
                [f"[{i+1}:a]volume={req.ambient_volume}[a{i}];" for i in range(len(local_ambient))]
            )
            mix_inputs = "".join([f"[a{i}]" for i in range(len(local_ambient))]) + \
                f"[{len(local_ambient)+1}:a]amix=inputs={len(local_ambient)+1}:duration=first[aout]"
            filter_complex = f"{amb_filter}{mix_inputs}"
            args = inputs + [
                "-filter_complex", filter_complex,
                "-map", "0:v", "-map", "[aout]",
                "-c:v", "copy", "-c:a", "aac", "-shortest",
                out_path,
            ]
            proc = subprocess.run(args, capture_output=True, timeout=180)
            return proc.returncode, proc.stderr.decode(errors="ignore")[-400:]

        code, err = await loop.run_in_executor(None, _mix)
        if code != 0:
            raise HTTPException(status_code=500, detail=f"FFmpeg mix 失败: {err}")
        out_filename = f"{task_id}_mixed.mp4"
        shutil.copy2(out_path, os.path.join(ASSET_UPLOAD_DIR, out_filename))
        return {"url": f"/asset-uploads/{out_filename}"}


@router.post("/optimize-prompt")
async def optimize_prompt(
    req: dict,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """提示词二次优化（LLM 润色）。body: {prompt: str, focus?: str='cinematic'}"""
    from app.services.one_shot_prompt import log_action
    prompt = req.get("prompt", "")
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="prompt 必填")
    focus = req.get("focus", "cinematic commercial photography")
    system = f"你是 TVC 广告提示词润色专家。基于原 prompt 润色，重点强化 {focus} 元素，输出纯英文单段文本，长度 80-120 词。不要解释。"
    from .glm_proxy import _glm_chat
    data = await _glm_chat(
        model="glm-4.5-air",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=2000,
    )
    optimized = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

    # 埋点
    if current_user:
        try:
            from app.database import async_session_maker
            from uuid import UUID
            async with async_session_maker() as db:
                log_action(db, task_id=current_user.id, user_id=current_user.id,
                          narrative="optimize", composition="optimize", action="optimized")
        except Exception:
            pass

    return {
        "original": prompt,
        "optimized": optimized,
        "diff_ratio": round(len(optimized) / max(len(prompt), 1), 2),
    }
