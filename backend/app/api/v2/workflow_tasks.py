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
    transition: str = "fade"
    resolution: str = "720p"
    output_format: str = "mp4"


RESOLUTION_MAP = {
    "480p": "854x480",
    "720p": "1280x720",
    "1080p": "1920x1080",
}


@router.post("/compose")
async def compose_tvc_video(
    req: ComposeRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """FFmpeg 合成：多镜头视频拼接 + BGM 混音 → 完整 TVC"""
    import httpx

    if not req.video_urls:
        raise HTTPException(status_code=400, detail="至少需要一个视频")

    resolution = RESOLUTION_MAP.get(req.resolution, "1280x720")

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

        # 2. 统一格式（保证拼接兼容）
        normalized: list[str] = []
        for i, vf in enumerate(video_files):
            norm_path = os.path.join(tmpdir, f"norm_{i:03d}.mp4")
            cmd = [
                "ffmpeg", "-y", "-i", vf,
                "-vf", f"scale={resolution}:force_original_aspect_ratio=decrease,pad={resolution}:(ow-iw)/2:(oh-ih)/2",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-an", norm_path,
            ]
            proc = subprocess.run(cmd, capture_output=True, timeout=60)
            if proc.returncode != 0:
                logger.error(f"ffmpeg normalize failed: {proc.stderr.decode()[-500:]}")
                raise HTTPException(status_code=500, detail=f"视频 {i+1} 格式化失败")
            normalized.append(norm_path)

        # 3. 拼接（concat demuxer）
        concat_list = os.path.join(tmpdir, "concat.txt")
        with open(concat_list, "w") as f:
            for nf in normalized:
                f.write(f"file '{nf}'\n")

        concat_path = os.path.join(tmpdir, f"concat.{req.output_format}")
        concat_cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list,
            "-c", "copy", concat_path,
        ]
        proc = subprocess.run(concat_cmd, capture_output=True, timeout=120)
        if proc.returncode != 0:
            logger.error(f"ffmpeg concat failed: {proc.stderr.decode()[-500:]}")
            raise HTTPException(status_code=500, detail="视频拼接失败")

        # 4. 混音（可选）
        final_path = concat_path
        if req.bgm_url:
            bgm_path = os.path.join(tmpdir, "bgm.mp3")
            try:
                async with httpx.AsyncClient(timeout=60) as http:
                    resp = await http.get(req.bgm_url)
                    resp.raise_for_status()
                    with open(bgm_path, "wb") as f:
                        f.write(resp.content)

                mixed_path = os.path.join(tmpdir, f"final.{req.output_format}")
                vol = max(0, min(1, req.bgm_volume))
                mix_cmd = [
                    "ffmpeg", "-y",
                    "-i", concat_path,
                    "-i", bgm_path,
                    "-filter_complex", f"[1:a]volume={vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                    "-map", "0:v", "-map", "[aout]",
                    "-c:v", "copy", "-c:a", "aac",
                    mixed_path,
                ]
                proc = subprocess.run(mix_cmd, capture_output=True, timeout=120)
                if proc.returncode == 0:
                    final_path = mixed_path
                else:
                    logger.warning(f"BGM mix failed, using no BGM: {proc.stderr.decode()[-300:]}")
            except Exception as e:
                logger.warning(f"BGM download/mix failed: {e}")

        # 5. 获取时长
        probe_cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", final_path]
        proc = subprocess.run(probe_cmd, capture_output=True, timeout=10)
        duration = float(proc.stdout.decode().strip() or "0")

        # 6. 保存到 asset-uploads 目录，返回 URL
        upload_base = os.environ.get(
            "ASSET_UPLOAD_DIR",
            os.path.join(os.path.dirname(__file__), "..", "..", "chat-uploads", "assets"),
        )
        os.makedirs(upload_base, exist_ok=True)
        output_filename = f"tvc_{uuid.uuid4().hex[:8]}.{req.output_format}"
        output_path = os.path.join(upload_base, output_filename)

        import shutil
        shutil.copy2(final_path, output_path)

        # 构建 URL
        from app.config import get_settings
        settings = get_settings()
        base_url = getattr(settings, "API_BASE_URL", "") or ""
        if base_url:
            video_url = f"{base_url}/asset-uploads/{output_filename}"
        else:
            # 从请求中推断
            video_url = f"/asset-uploads/{output_filename}"

        return {"url": video_url, "duration": duration}
