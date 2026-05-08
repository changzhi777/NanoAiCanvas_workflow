"""生成任务日志 API"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.auth import get_current_user_optional
from app.models import User
from app.models.generation_log import GenerationTaskLog, GenerationStatus

router = APIRouter(prefix="/api/v2/generation-logs", tags=["generation-logs"])


class CreateLogRequest(BaseModel):
    node_id: Optional[str] = None
    workflow_id: Optional[str] = None
    skill_id: Optional[str] = None
    prompt: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    total_time_ms: Optional[int] = None
    step_durations: Optional[dict] = None
    model_params: Optional[dict] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


@router.post("")
async def create_log(
    req: CreateLogRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    try:
        status = GenerationStatus(req.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {req.status}")

    total_time_ms = req.total_time_ms
    if not total_time_ms and req.started_at and req.completed_at:
        try:
            start = datetime.fromisoformat(req.started_at.replace("Z", "+00:00"))
            end = datetime.fromisoformat(req.completed_at.replace("Z", "+00:00"))
            total_time_ms = int((end - start).total_seconds() * 1000)
        except Exception:
            pass

    log = GenerationTaskLog(
        user_id=current_user.id if current_user else None,
        node_id=req.node_id,
        workflow_id=req.workflow_id,
        skill_id=req.skill_id,
        prompt=req.prompt,
        status=status,
        error_message=req.error_message,
        total_time_ms=total_time_ms,
        step_durations=req.step_durations,
        model_params=req.model_params,
        started_at=datetime.fromisoformat(req.started_at.replace("Z", "+00:00")) if req.started_at else None,
        completed_at=datetime.fromisoformat(req.completed_at.replace("Z", "+00:00")) if req.completed_at else None,
    )
    db.add(log)
    await db.commit()
    return {"id": log.id, "status": "ok"}


@router.get("/stats")
async def get_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)

    total_q = select(func.count(GenerationTaskLog.id)).where(GenerationTaskLog.created_at >= since)
    success_q = select(func.count(GenerationTaskLog.id)).where(
        GenerationTaskLog.created_at >= since,
        GenerationTaskLog.status == "success",
    )
    failed_q = select(func.count(GenerationTaskLog.id)).where(
        GenerationTaskLog.created_at >= since,
        GenerationTaskLog.status == "failed",
    )
    aborted_q = select(func.count(GenerationTaskLog.id)).where(
        GenerationTaskLog.created_at >= since,
        GenerationTaskLog.status == "aborted",
    )
    avg_time_q = select(func.avg(GenerationTaskLog.total_time_ms)).where(
        GenerationTaskLog.created_at >= since,
        GenerationTaskLog.total_time_ms.isnot(None),
    )

    total = (await db.execute(total_q)).scalar() or 0
    success = (await db.execute(success_q)).scalar() or 0
    failed = (await db.execute(failed_q)).scalar() or 0
    aborted = (await db.execute(aborted_q)).scalar() or 0
    avg_time = (await db.execute(avg_time_q)).scalar()

    # 错误分布 Top5
    error_q = (
        select(GenerationTaskLog.error_message, func.count(GenerationTaskLog.id).label("cnt"))
        .where(GenerationTaskLog.created_at >= since, GenerationTaskLog.error_message.isnot(None))
        .group_by(GenerationTaskLog.error_message)
        .order_by(func.count(GenerationTaskLog.id).desc())
        .limit(5)
    )
    error_rows = (await db.execute(error_q)).all()
    top_errors = [{"error": r[0][:100], "count": r[1]} for r in error_rows if r[0]]

    return {
        "period_days": days,
        "total": total,
        "success": success,
        "failed": failed,
        "aborted": aborted,
        "success_rate": round(success / total * 100, 1) if total else 0,
        "avg_time_ms": round(avg_time) if avg_time else None,
        "top_errors": top_errors,
    }
