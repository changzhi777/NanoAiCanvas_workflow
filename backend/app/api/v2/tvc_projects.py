"""
TVC 项目管理 API
CRUD + 镜头管理 + 任务结果关联
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.auth import get_current_user
from app.models.tvc_project import TvcProject, TvcProjectShot, TvcProjectStatus
from app.models.user import User

router = APIRouter(prefix="/api/v2/tvc-projects", tags=["TVC Projects"])

VALID_PROJECT_STATUSES = {s.value for s in TvcProjectStatus}
UPDATABLE_PROJECT_FIELDS = {"name", "description", "original_text", "script", "composed_video_url", "bgm_url", "status", "task_id"}
UPDATABLE_SHOT_FIELDS = {"scene_number", "scene_description", "video_prompt", "start_frame_prompt", "end_frame_prompt", "bgm_mood", "image_url", "video_url", "duration", "image_asset_id", "video_asset_id", "dialogue", "status"}


# ==================== Pydantic Schemas ====================

class CreateProjectRequest(BaseModel):
    name: str
    original_text: str
    description: Optional[str] = None
    team_id: Optional[int] = None

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    original_text: Optional[str] = None
    script: Optional[dict] = None
    composed_video_url: Optional[str] = None
    bgm_url: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None

class UpsertShotRequest(BaseModel):
    shot_index: int
    scene_number: Optional[int] = None
    scene_description: Optional[str] = None
    video_prompt: Optional[str] = None
    start_frame_prompt: Optional[str] = None
    end_frame_prompt: Optional[str] = None
    bgm_mood: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[float] = 5.0
    image_asset_id: Optional[str] = None
    video_asset_id: Optional[str] = None
    dialogue: Optional[dict] = None
    status: Optional[str] = "pending"

class UpsertShotsBatchRequest(BaseModel):
    shots: list[UpsertShotRequest]

class LinkTaskRequest(BaseModel):
    task_id: Optional[str] = None
    script: Optional[dict] = None
    shots: Optional[list[UpsertShotRequest]] = None
    composed_video_url: Optional[str] = None
    bgm_url: Optional[str] = None
    status: Optional[str] = None


# ==================== 共享镜头 Upsert 逻辑 ====================

async def _upsert_shots(db: AsyncSession, pid: uuid.UUID, shots: list[UpsertShotRequest]) -> tuple[int, int]:
    """批量 upsert 镜头，返回 (created, updated)"""
    existing_stmt = select(TvcProjectShot).where(TvcProjectShot.project_id == pid)
    existing = {s.shot_index: s for s in (await db.execute(existing_stmt)).scalars().all()}

    created, updated = 0, 0
    for shot_data in shots:
        dump = shot_data.model_dump()
        # UUID 转换：仅对非空字符串执行
        for field in ("image_asset_id", "video_asset_id"):
            val = dump.get(field)
            if val and isinstance(val, str):
                dump[field] = uuid.UUID(val)

        if shot_data.shot_index in existing:
            shot = existing[shot_data.shot_index]
            for k, v in dump.items():
                setattr(shot, k, v)
            updated += 1
        else:
            db.add(TvcProjectShot(project_id=pid, **dump))
            created += 1
    return created, updated


# ==================== Endpoints ====================

@router.get("")
async def list_projects(
    status: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出当前用户的 TVC 项目"""
    # Total count
    count_stmt = select(func.count()).select_from(TvcProject).where(TvcProject.user_id == current_user.id)
    if status:
        count_stmt = count_stmt.where(TvcProject.status == status)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginated list with shot count
    shot_count_subq = (
        select(func.count())
        .select_from(TvcProjectShot)
        .where(TvcProjectShot.project_id == TvcProject.id)
        .correlate(TvcProject)
        .scalar_subquery()
    )
    stmt = select(TvcProject, shot_count_subq.label("shot_count")).where(
        TvcProject.user_id == current_user.id
    ).order_by(TvcProject.updated_at.desc())
    if status:
        stmt = stmt.where(TvcProject.status == status)

    result = await db.execute(stmt.offset(offset).limit(limit))
    rows = result.all()

    return {
        "total": total,
        "items": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "original_text": p.original_text[:100] if p.original_text else "",
                "status": p.status,
                "shot_count": shot_count,
                "task_id": p.task_id,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p, shot_count in rows
        ],
    }


@router.post("")
async def create_project(
    req: CreateProjectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建 TVC 项目"""
    project = TvcProject(
        user_id=current_user.id,
        team_id=req.team_id,
        name=req.name,
        description=req.description,
        original_text=req.original_text,
        status=TvcProjectStatus.DRAFT,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return {"id": str(project.id), "status": project.status}


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目详情（含镜头列表）"""
    stmt = (
        select(TvcProject)
        .options(selectinload(TvcProject.shots))
        .where(TvcProject.id == uuid.UUID(project_id), TvcProject.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "original_text": project.original_text,
        "script": project.script,
        "composed_video_url": project.composed_video_url,
        "bgm_url": project.bgm_url,
        "status": project.status,
        "task_id": project.task_id,
        "team_id": project.team_id,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        "shots": [
            {
                "id": str(s.id),
                "shot_index": s.shot_index,
                "scene_number": s.scene_number,
                "scene_description": s.scene_description,
                "video_prompt": s.video_prompt,
                "start_frame_prompt": s.start_frame_prompt,
                "end_frame_prompt": s.end_frame_prompt,
                "bgm_mood": s.bgm_mood,
                "image_url": s.image_url,
                "video_url": s.video_url,
                "duration": s.duration,
                "image_asset_id": str(s.image_asset_id) if s.image_asset_id else None,
                "video_asset_id": str(s.video_asset_id) if s.video_asset_id else None,
                "dialogue": s.dialogue,
                "status": s.status,
            }
            for s in project.shots
        ],
    }


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    req: UpdateProjectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新项目信息"""
    stmt = select(TvcProject).where(
        TvcProject.id == uuid.UUID(project_id), TvcProject.user_id == current_user.id
    )
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    updates = req.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in VALID_PROJECT_STATUSES:
        raise HTTPException(400, f"Invalid status: {updates['status']}")
    for k in UPDATABLE_PROJECT_FIELDS & updates.keys():
        setattr(project, k, updates[k])

    await db.commit()
    return {"id": str(project.id), "status": "updated"}


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除项目及其所有镜头"""
    pid = uuid.UUID(project_id)
    exists_stmt = select(TvcProject.id).where(TvcProject.id == pid, TvcProject.user_id == current_user.id)
    if not (await db.execute(exists_stmt)).scalar_one_or_none():
        raise HTTPException(404, "Project not found")

    await db.execute(sa_delete(TvcProject).where(TvcProject.id == pid))
    await db.commit()
    return {"status": "deleted"}


@router.post("/{project_id}/shots")
async def upsert_shots_batch(
    project_id: str,
    req: UpsertShotsBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量创建/更新镜头（按 shot_index 匹配）"""
    pid = uuid.UUID(project_id)

    # 验证项目归属
    stmt = select(TvcProject.id).where(TvcProject.id == pid, TvcProject.user_id == current_user.id)
    if not (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(404, "Project not found")

    created, updated = await _upsert_shots(db, pid, req.shots)
    await db.commit()
    return {"created": created, "updated": updated}


@router.put("/{project_id}/shots/{shot_id}")
async def update_shot(
    project_id: str,
    shot_id: str,
    req: UpsertShotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新单个镜头"""
    pid = uuid.UUID(project_id)

    # 先验项目归属
    proj_stmt = select(TvcProject.id).where(TvcProject.id == pid, TvcProject.user_id == current_user.id)
    if not (await db.execute(proj_stmt)).scalar_one_or_none():
        raise HTTPException(404, "Project not found")

    # 再查镜头
    stmt = select(TvcProjectShot).where(TvcProjectShot.id == uuid.UUID(shot_id), TvcProjectShot.project_id == pid)
    shot = (await db.execute(stmt)).scalar_one_or_none()
    if not shot:
        raise HTTPException(404, "Shot not found")

    updates = req.model_dump(exclude_unset=True)
    for field in ("image_asset_id", "video_asset_id"):
        val = updates.get(field)
        if val and isinstance(val, str):
            updates[field] = uuid.UUID(val)
    for k in UPDATABLE_SHOT_FIELDS & updates.keys():
        setattr(shot, k, updates[k])
    await db.commit()
    return {"id": str(shot.id), "status": "updated"}


@router.post("/{project_id}/link-task")
async def link_task_result(
    project_id: str,
    req: LinkTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """关联 TVC 后台任务执行结果到项目"""
    pid = uuid.UUID(project_id)

    stmt = select(TvcProject).where(TvcProject.id == pid, TvcProject.user_id == current_user.id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    # 更新项目字段
    if req.task_id:
        project.task_id = req.task_id
    if req.script:
        project.script = req.script
    if req.composed_video_url:
        project.composed_video_url = req.composed_video_url
    if req.bgm_url:
        project.bgm_url = req.bgm_url
    if req.status:
        if req.status not in VALID_PROJECT_STATUSES:
            raise HTTPException(400, f"Invalid status: {req.status}")
        project.status = req.status

    # 批量写入镜头
    if req.shots:
        await _upsert_shots(db, pid, req.shots)

    await db.commit()
    return {"status": "linked", "project_id": str(pid)}
