import io
import zipfile
import json
import hashlib
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import httpx

from app.database import get_db
from app.models import User, Asset, AssetType, AssetCategory, Category
from app.api.auth import get_current_user

router = APIRouter(prefix="/assets", tags=["assets-import-export"])


class AssetExportItem(BaseModel):
    id: str
    name: str
    type: str
    url: str
    thumbnail_url: str | None
    category: str | None
    tags: List[str]
    metadata: dict
    created_at: str


class ExportResponse(BaseModel):
    assets: List[AssetExportItem]
    total: int


@router.post("/export")
async def export_assets(
    ids: List[str],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """导出选中资产为 ZIP 包（含图片 + metadata.json + prompt.md）"""
    if not ids:
        raise HTTPException(status_code=400, detail="请选择要导出的资产")

    # 获取资产
    query = select(Asset).where(
        Asset.id.in_([UUID(i) for i in ids]),
        Asset.user_id == current_user.id,
        Asset.is_deleted == False,
    )
    result = await db.execute(query)
    assets = result.scalars().all()

    if not assets:
        raise HTTPException(status_code=404, detail="未找到可导出的资产")

    # 创建 ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        metadata_list = []
        prompts_dir = "prompts"
        zip_file.mkdir(zipped_dir=prompts_dir, exists_ok=True)

        for asset in assets:
            # 下载图片
            try:
                image_response = await fetch_asset_image(asset.url)
                if image_response:
                    # 获取文件扩展名
                    ext = get_extension_from_url(asset.url) or get_extension_from_content_type(image_response.headers.get('content-type', ''))
                    filename = f"{asset.name}{ext}"
                    zip_file.writestr(f"images/{filename}", image_response.content)

                    # 生成 metadata.json 条目
                    metadata_list.append({
                        "id": str(asset.id),
                        "name": asset.name,
                        "type": asset.type.value if hasattr(asset.type, 'value') else asset.type,
                        "image_path": f"images/{filename}",
                        "thumbnail_path": f"images/{filename}",
                        "category": asset.category.value if asset.category else None,
                        "tags": asset.tags or [],
                        "metadata": asset.meta_data or {},
                        "created_at": asset.created_at.isoformat() if asset.created_at else "",
                    })

                    # 生成 prompt.md
                    prompt_content = generate_prompt_md(asset)
                    zip_file.writestr(f"prompts/{asset.id}.md", prompt_content)
            except Exception as e:
                print(f"Failed to export asset {asset.id}: {e}")
                continue

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=assets_export_{len(assets)}.zip"},
    )


@router.post("/import")
async def import_assets(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """从 ZIP 包导入资产"""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="请上传 ZIP 文件")

    try:
        contents = await file.read()
        zip_buffer = io.BytesIO(contents)

        imported_count = 0
        errors = []

        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            # 读取 metadata.json
            if "metadata.json" not in zip_file.namelist():
                raise HTTPException(status_code=400, detail="ZIP 包中缺少 metadata.json")

            metadata_content = zip_file.read("metadata.json").decode('utf-8')
            metadata_list = json.loads(metadata_content)

            for item in metadata_list:
                try:
                    # 检查是否已存在（同名 + 同用户）
                    existing_query = select(Asset).where(
                        Asset.user_id == current_user.id,
                        Asset.name == item['name'],
                    )
                    result = await db.execute(existing_query)
                    if result.scalar_one_or_none():
                        errors.append(f"跳过已存在: {item['name']}")
                        continue

                    # 解压图片
                    image_path = item.get('image_path', '')
                    if not image_path:
                        errors.append(f"无图片路径: {item['name']}")
                        continue

                    if image_path not in zip_file.namelist():
                        errors.append(f"图片不存在: {image_path}")
                        continue

                    image_data = zip_file.read(image_path)
                    # 这里应该上传到存储服务，为了简化先存本地路径
                    uploaded_url = await upload_asset_file(image_data, image_path)

                    # 创建资产
                    asset = Asset(
                        user_id=current_user.id,
                        type=AssetType(item['type']) if isinstance(item['type'], str) else AssetType.IMAGE,
                        name=item['name'],
                        url=uploaded_url,
                        thumbnail_url=uploaded_url,
                        category=AssetCategory(item['category']) if item.get('category') else None,
                        tags=item.get('tags', []),
                        meta_data=item.get('metadata', {}),
                    )
                    db.add(asset)
                    imported_count += 1

                except Exception as e:
                    errors.append(f"导入失败 {item.get('name', 'unknown')}: {str(e)}")

            await db.commit()

        return {
            "success": True,
            "imported": imported_count,
            "errors": errors if errors else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


async def fetch_asset_image(url: str) -> httpx.Response:
    """获取远程图片"""
    async with httpx.AsyncClient() as client:
        return await client.get(url, timeout=30)


def get_extension_from_url(url: str) -> str:
    """从 URL 获取扩展名"""
    import os
    ext = os.path.splitext(url.split('?')[0])[1]
    return ext if ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp'] else '.png'


def get_extension_from_content_type(content_type: str) -> str:
    """从 Content-Type 获取扩展名"""
    mapping = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'image/webp': '.webp',
    }
    return mapping.get(content_type, '.png')


async def upload_asset_file(data: bytes, original_path: str) -> str:
    """上传文件到存储（简化实现）"""
    # TODO: 实现实际上传逻辑（上传到 S3/OSS/本地存储）
    # 当前返回假 URL
    import hashlib
    file_hash = hashlib.md5(data).hexdigest()[:16]
    ext = get_extension_from_url(original_path)
    return f"file://imported/{file_hash}{ext}"


def generate_prompt_md(asset: Asset) -> str:
    """生成 prompt.md 内容"""
    lines = [
        f"# {asset.name}",
        "",
        f"**类型**: {asset.type.value if hasattr(asset.type, 'value') else asset.type}",
        f"**分类**: {asset.category.value if asset.category else '未分类'}",
        f"**标签**: {', '.join(asset.tags) if asset.tags else '无'}",
        f"**创建时间**: {asset.created_at.isoformat() if asset.created_at else '未知'}",
        "",
        "## 元数据",
        f"```json",
        json.dumps(asset.meta_data or {}, ensure_ascii=False, indent=2),
        f"```",
        "",
        "## Prompt",
        f"{asset.meta_data.get('prompt', 'N/A') if asset.meta_data else 'N/A'}",
    ]
    return "\n".join(lines)