"""V2 3D 生成 API — 腾讯混元 3D（hy3d-cli）代理

链路：客户端 → /v2/3d/* → hy3d /api/v1/*。
上游结果 URL 为腾讯 COS 签名地址（约 24h），下载统一走 /download/{job_id} 流式代理。
"""

import logging
import re
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v2/3d", tags=["v2-3d"])

MODELS = ("3.0", "3.1", "rapid")
GENERATE_TYPES = ("Normal", "LowPoly", "Geometry", "Sketch")
RESULT_FORMATS = ("GLB", "STL", "USDZ", "FBX")
VIEW_TYPES = (
    "left", "right", "back", "top", "bottom", "left_front", "right_front",
)
JOB_ID_RE = re.compile(r"^job_[A-Za-z0-9]{8,32}$")


# ---------- 请求模型 ----------

class MultiViewImage(BaseModel):
    view_type: str
    view_image_url: Optional[str] = None
    view_image_base64: Optional[str] = None


class ThreeDBaseRequest(BaseModel):
    model: str = "3.0"
    enable_pbr: bool = False
    face_count: int = Field(default=30000, ge=3000, le=1500000)
    generate_type: str = "Normal"
    result_format: str = "GLB"
    polygon_type: str = "triangle"


class Text2MeshRequest(ThreeDBaseRequest):
    prompt: str = Field(..., min_length=1, max_length=1024)


class Img2MeshRequest(ThreeDBaseRequest):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    multi_view_images: Optional[List[MultiViewImage]] = None


# ---------- 校验与错误映射 ----------

def _validate_common(req: ThreeDBaseRequest) -> None:
    if req.model not in MODELS:
        raise HTTPException(422, f"model 必须是 {MODELS} 之一")
    if req.generate_type not in GENERATE_TYPES:
        raise HTTPException(422, f"generate_type 必须是 {GENERATE_TYPES} 之一")
    if req.result_format not in RESULT_FORMATS:
        raise HTTPException(422, f"result_format 必须是 {RESULT_FORMATS} 之一")
    if req.generate_type == "Geometry" and req.enable_pbr:
        raise HTTPException(422, "白模模式（Geometry）不支持 PBR 材质")
    if req.model == "3.1" and req.generate_type == "LowPoly":
        raise HTTPException(422, "3.1 版本不支持智能拓扑（LowPoly）")


def _validate_img(req: Img2MeshRequest) -> None:
    _validate_common(req)
    if not req.image_url and not req.image_base64:
        raise HTTPException(422, "必须提供 image_url 或 image_base64")
    if req.image_url and req.image_base64:
        raise HTTPException(422, "image_url 与 image_base64 只能二选一")
    views = req.multi_view_images or []
    if views and req.model == "rapid":
        raise HTTPException(422, "极速版不支持多视角输入")
    if views and req.model != "3.1":
        raise HTTPException(422, "多视角仅 3.1 版本支持")
    seen = set()
    for v in views:
        if v.view_type not in VIEW_TYPES:
            raise HTTPException(422, f"非法视角类型：{v.view_type}")
        if v.view_type in seen:
            raise HTTPException(422, f"视角重复：{v.view_type}")
        seen.add(v.view_type)
        if bool(v.view_image_url) == bool(v.view_image_base64):
            raise HTTPException(422, f"视角 {v.view_type} 的 url/base64 必须二选一")


def _upstream_detail(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        detail = data.get("detail") if isinstance(data, dict) else None
        if isinstance(detail, str):
            return detail
        if detail is not None:
            return str(detail)[:300]
    except Exception:  # noqa: BLE001
        pass
    return (resp.text or "")[:300]


def _raise_upstream(status: int, detail: str) -> None:
    if "3个任务上限" in detail:
        raise HTTPException(429, "当前已达到 3 个任务上限，请稍后重试")
    if status == 400 and "任务未完成" in detail:
        raise HTTPException(409, "模型仍在生成，请稍后再试")
    if status in (401, 403):
        logger.error("hy3d 鉴权失败: %s", detail)
        raise HTTPException(502, "3D 服务鉴权失败（服务端配置）")
    if status == 404:
        raise HTTPException(404, detail or "3D 任务或结果不存在")
    if status == 422:
        raise HTTPException(422, detail or "3D 参数不合法")
    if status == 504:
        raise HTTPException(504, "3D 服务超时，请重试")
    logger.error("hy3d 上游异常 %s: %s", status, detail)
    raise HTTPException(502, f"3D 服务异常：{detail or status}")


# ---------- HTTP 辅助 ----------

def _base_url() -> str:
    return get_settings().HY3D_API_BASE_URL.rstrip("/")


def _headers() -> dict[str, str]:
    key = get_settings().HY3D_API_KEY
    return {"X-API-Key": key} if key else {}


TIMEOUT = httpx.Timeout(30.0, connect=10.0)


async def _request(method: str, path: str, **kwargs: Any) -> Any:
    url = f"{_base_url()}{path}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=_headers()) as client:
            resp = await client.request(method, url, **kwargs)
    except httpx.TimeoutException as exc:
        logger.warning("hy3d 超时 %s %s: %s", method, path, exc)
        raise HTTPException(504, "3D 服务超时，请重试")
    except httpx.RequestError as exc:
        logger.error("hy3d 连接失败 %s %s: %s", method, path, exc)
        raise HTTPException(502, "无法连接 3D 服务")
    if resp.status_code >= 400:
        _raise_upstream(resp.status_code, _upstream_detail(resp))
    try:
        return resp.json()
    except ValueError:
        raise HTTPException(502, "3D 服务返回了非法响应")


# ---------- 路由 ----------

@router.post("/text2mesh")
async def create_text2mesh(req: Text2MeshRequest):
    _validate_common(req)
    payload = req.model_dump(exclude_none=True)
    return await _request("POST", "/api/v1/text2mesh", json=payload)


@router.post("/img2mesh")
async def create_img2mesh(req: Img2MeshRequest):
    _validate_img(req)
    payload = req.model_dump(exclude_none=True)
    return await _request("POST", "/api/v1/img2mesh", json=payload)


@router.get("/tasks/{job_id}")
async def get_task(job_id: str):
    if not JOB_ID_RE.match(job_id):
        raise HTTPException(422, "非法 job_id")
    return await _request("GET", f"/api/v1/tasks/{job_id}")


@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if status:
        params["status"] = status
    if task_type:
        params["task_type"] = task_type
    return await _request("GET", "/api/v1/tasks", params=params)


@router.get("/download/{job_id}")
async def download_result(job_id: str, format: str = Query("GLB")):
    """流式代理 GLB/STL 等结果，避免客户端接触 COS 签名 URL。"""
    if not JOB_ID_RE.match(job_id):
        raise HTTPException(422, "非法 job_id")
    fmt = format.upper()
    if fmt not in RESULT_FORMATS:
        raise HTTPException(422, f"format 必须是 {RESULT_FORMATS} 之一")

    client = httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0), headers=_headers())
    try:
        req = client.build_request(
            "GET", f"{_base_url()}/api/v1/download/{job_id}/local", params={"format": fmt}
        )
        resp = await client.send(req, stream=True)
    except httpx.TimeoutException:
        await client.aclose()
        raise HTTPException(504, "3D 结果下载超时")
    except httpx.RequestError:
        await client.aclose()
        raise HTTPException(502, "无法连接 3D 服务")

    if resp.status_code >= 400:
        detail = (await resp.aread()).decode("utf-8", "ignore")[:300]
        await resp.aclose()
        await client.aclose()
        _raise_upstream(resp.status_code, detail)

    async def cleanup() -> None:
        await resp.aclose()
        await client.aclose()

    media_type = "model/gltf-binary" if fmt == "GLB" else "application/octet-stream"
    return StreamingResponse(
        resp.aiter_bytes(),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{job_id}.{fmt.lower()}"'},
        background=BackgroundTask(cleanup),
    )
