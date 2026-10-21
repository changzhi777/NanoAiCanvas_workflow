"""V2 上传：参考图/抠像输入图公网化（COS），供 Provider 拉取。

POST /v2/uploads  multipart(file)  → {"url": "https://..."}
"""
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.auth import get_current_user_optional
from app.models import User
from app.services.cos_upload import is_cos_enabled, upload_bytes_to_cos

router = APIRouter(prefix="/v2/uploads", tags=["v2-uploads"])

ALLOWED = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
MAX_SIZE = 15 * 1024 * 1024


@router.post("")
async def upload(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="需要登录后上传")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="图片不能超过 15MB")
    if not is_cos_enabled():
        raise HTTPException(status_code=503, detail="COS 未配置，无法生成公网图片 URL")
    ext = ALLOWED.get(file.content_type, "png")
    url = await upload_bytes_to_cos(content, key_hint="craft/uploads", ext=ext)
    if not url:
        raise HTTPException(status_code=502, detail="上传失败")
    return {"url": url}
