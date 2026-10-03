"""TVC 验收标准审查闸 API
- POST /api/v2/tvc-acceptance/import-feishu   抓取飞书 Brief（预览，不落库）
- POST /api/v2/tvc-acceptance/templates/from-brief  从 Brief 条目 upsert 模板
- GET  /api/v2/tvc-acceptance/templates        模板列表
- GET  /api/v2/tvc-acceptance/templates/{id}   模板详情
- PUT  /api/v2/tvc-acceptance/templates/{id}   更新（权重/开关）
- DELETE /api/v2/tvc-acceptance/templates/{id} 删除
- GET  /api/v2/tvc-acceptance/reports?task_id= 查任务报告
- POST /api/v2/tvc-acceptance/reports/{id}/decision  接受/重做决策
- GET  /api/v2/tvc-acceptance/reports/{id}/export    导出客户版 markdown
"""
import json
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.auth import get_current_user, require_admin
from app.models import User
from app.models.tvc_acceptance import TvcAcceptanceTemplate, TvcAcceptanceReport, DEFAULT_KFC_TEMPLATE
from app.services import feishu_brief

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/tvc-acceptance", tags=["tvc-acceptance"])


# ==================== Schemas ====================

class ImportFeishuRequest(BaseModel):
    share_url: str


class FromBriefRequest(BaseModel):
    customer_code: str
    name: str
    aspect_ratio: str = "9:16"
    duration_sec: int = 15
    criteria: list          # 前端可用 preview.criteria_overrides 合成后的完整 criteria
    brief_ctx: dict = {}    # Brief 上下文（产品名/价格/文案），规则层+LLM层审查用


class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    aspect_ratio: Optional[str] = None
    duration_sec: Optional[int] = None
    criteria: Optional[list] = None
    is_active: Optional[bool] = None


class DecisionRequest(BaseModel):
    action: str             # accept | redo_done
    note: Optional[str] = None


# ==================== 飞书导入 ====================

@router.post("/import-feishu")
async def import_feishu(req: ImportFeishuRequest, _user: User = Depends(get_current_user)):
    """抓取飞书 Brief 并解析为条目列表（预览，不落库）。"""
    try:
        rows = await feishu_brief.fetch_bitable(req.share_url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    bundle = feishu_brief.bundle_from_share_url_sync(rows["rows"], rows.get("base_name", ""))
    return bundle


# ==================== 模板 CRUD ====================

async def _get_template_or_404(db: AsyncSession, template_id: str) -> TvcAcceptanceTemplate:
    try:
        tid = UUID(template_id)
    except ValueError:
        raise HTTPException(400, "模板 ID 格式错误")
    row = (await db.execute(select(TvcAcceptanceTemplate).where(TvcAcceptanceTemplate.id == tid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "模板不存在")
    return row


@router.post("/templates/from-brief")
async def create_template_from_brief(req: FromBriefRequest, _user: User = Depends(get_current_user),
                                     db: AsyncSession = Depends(get_db)):
    """从 Brief 条目 upsert 模板（customer_code 唯一，存在则覆盖 criteria）。"""
    existing = (await db.execute(
        select(TvcAcceptanceTemplate).where(TvcAcceptanceTemplate.customer_code == req.customer_code)
    )).scalar_one_or_none()
    if existing:
        existing.name = req.name
        existing.aspect_ratio = req.aspect_ratio
        existing.duration_sec = req.duration_sec
        existing.criteria = req.criteria
        existing.brief_ctx = req.brief_ctx
        await db.commit()
        return {"id": str(existing.id), "updated": True}
    row = TvcAcceptanceTemplate(
        customer_code=req.customer_code, name=req.name,
        aspect_ratio=req.aspect_ratio, duration_sec=req.duration_sec,
        criteria=req.criteria, brief_ctx=req.brief_ctx,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), "created": True}


@router.get("/templates")
async def list_templates(_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(TvcAcceptanceTemplate).where(TvcAcceptanceTemplate.is_active == True)  # noqa: E712
        .order_by(TvcAcceptanceTemplate.updated_at.desc())
    )).scalars().all()
    return {"items": [{
        "id": str(r.id), "customer_code": r.customer_code, "name": r.name,
        "aspect_ratio": r.aspect_ratio, "duration_sec": r.duration_sec,
        "criteria_count": len(r.criteria or []), "updated_at": r.updated_at.isoformat(),
    } for r in rows]}


@router.get("/templates/{template_id}")
async def get_template(template_id: str, _user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    row = await _get_template_or_404(db, template_id)
    return {"id": str(row.id), "customer_code": row.customer_code, "name": row.name,
            "aspect_ratio": row.aspect_ratio, "duration_sec": row.duration_sec,
            "criteria": row.criteria, "brief_ctx": row.brief_ctx or {}, "is_active": row.is_active}


@router.put("/templates/{template_id}")
async def update_template(template_id: str, req: TemplateUpdateRequest,
                          _user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    row = await _get_template_or_404(db, template_id)
    for field in ("name", "aspect_ratio", "duration_sec", "criteria", "is_active"):
        val = getattr(req, field)
        if val is not None:
            setattr(row, field, val)
    await db.commit()
    return {"updated": True, "id": str(row.id)}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, _user: User = Depends(require_admin),
                          db: AsyncSession = Depends(get_db)):
    row = await _get_template_or_404(db, template_id)
    row.is_active = False
    await db.commit()
    return {"deleted": True}


# ==================== 报告 ====================

@router.get("/reports")
async def list_reports(task_id: str, _user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(TvcAcceptanceReport).where(TvcAcceptanceReport.task_id == task_id)
        .order_by(TvcAcceptanceReport.created_at.desc())
    )).scalars().all()
    return {"items": [_report_dict(r) for r in rows]}


@router.get("/reports/{report_id}")
async def get_report(report_id: str, _user: User = Depends(get_current_user),
                     db: AsyncSession = Depends(get_db)):
    row = await _get_report_or_404(db, report_id)
    return _report_dict(row, detail=True)


async def _get_report_or_404(db: AsyncSession, report_id: str) -> TvcAcceptanceReport:
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "报告 ID 格式错误")
    row = (await db.execute(select(TvcAcceptanceReport).where(TvcAcceptanceReport.id == rid))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "报告不存在")
    return row


def _report_dict(r: TvcAcceptanceReport, detail: bool = False) -> dict:
    d = {
        "id": str(r.id), "task_id": r.task_id, "gate": r.gate, "status": r.status,
        "score": r.score, "veto_hit": r.veto_hit, "conflicts_top": r.conflicts_top,
        "redo_count": r.redo_count, "decision": r.decision, "created_at": r.created_at.isoformat(),
    }
    if detail:
        d["items"] = r.items
        d["template_snapshot"] = r.template_snapshot
        d["model_meta"] = r.model_meta
    return d


@router.post("/reports/{report_id}/decision")
async def decide(report_id: str, req: DecisionRequest,
                 _user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """用户决策：accept（接受交付）/ redo_done（重做完成后再标记）。"""
    if req.action not in ("accept", "redo_done"):
        raise HTTPException(400, "action 须为 accept / redo_done")
    row = await _get_report_or_404(db, report_id)
    row.decision = "accepted" if req.action == "accept" else "redo_done"
    await db.commit()
    return {"decision": row.decision}


@router.get("/reports/{report_id}/export")
async def export_report(report_id: str, _user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    """导出客户版报告（正式措辞 markdown）。"""
    row = await _get_report_or_404(db, report_id)
    snap = row.template_snapshot or {}
    lines = [
        "# TVC 验收质量报告",
        "",
        f"- 任务编号：{row.task_id}",
        f"- 审查环节：{'剧本审查' if row.gate == 'script' else '成片审查'}",
        f"- 审查结论：{'✅ 符合标准' if row.status == 'passed' else ('⚠️ 待复核' if row.status == 'unverified' else '❌ 需修改')}",
        f"- 标准符合度：{row.score}%",
        f"- 依据标准：{snap.get('name', '客户验收模板')}",
        "",
        "## 检查明细",
        "",
        "| 检查项 | 结果 | 说明 |",
        "|--------|------|------|",
    ]
    for it in (row.items or []):
        if it.get("category") == "archive":
            continue
        mark = "符合" if it.get("pass") else ("待复核" if it.get("pass") is None else "不符合")
        note = it.get("conflict") or it.get("actual") or ""
        lines.append(f"| {it.get('label', it['key'])} | {mark} | {note[:60]} |")
    if row.status == "passed":
        lines += ["", "本片已按客户验收标准完成自动化审查，各项指标符合要求。"]
    else:
        lines += ["", "## 改进说明", ""]
        for c in (row.conflicts_top or []):
            if c.get("key") == "_service":
                continue
            lines.append(f"- **{c.get('label', c['key'])}**：{c.get('conflict', '')}")
    content = "\n".join(lines)
    return Response(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=acceptance-{row.task_id}-{row.gate}.md"},
    )


# ==================== 引擎侧工具（供 tvc_engine 调用） ====================

async def load_template(template_id, db: AsyncSession) -> Optional[dict]:
    """引擎插桩用：加载模板 → dict（含 brief_ctx 存 criteria 首项外挂）。

    brief_ctx 在 from-brief 时存于模板无独立列——此处从 criteria 项的 prompt_hint 还原不足，
    因此引擎调用时以 template_snapshot 传递：criteria + aspect_ratio + duration_sec + customer 元信息。
    """
    try:
        tid = UUID(str(template_id))
    except (ValueError, TypeError):
        return None
    row = (await db.execute(
        select(TvcAcceptanceTemplate).where(TvcAcceptanceTemplate.id == tid, TvcAcceptanceTemplate.is_active == True)  # noqa: E712
    )).scalar_one_or_none()
    if not row:
        return None
    return {"id": str(row.id), "customer_code": row.customer_code, "name": row.name,
            "aspect_ratio": row.aspect_ratio, "duration_sec": row.duration_sec,
            "criteria": row.criteria or [], "brief_ctx": row.brief_ctx or {}}


async def save_report(task_id: str, gate: str, report: dict, template: dict | None,
                      db: AsyncSession) -> str:
    """审查报告落库（引擎插桩调用）。返回 report_id。

    redo 链：新报告继承同 task+gate 最新行的 redo_count（重做报告从 0 起算会丢失次数账）。
    """
    prev = (await db.execute(
        select(TvcAcceptanceReport)
        .where(TvcAcceptanceReport.task_id == task_id, TvcAcceptanceReport.gate == gate)
        .order_by(TvcAcceptanceReport.created_at.desc())
    )).scalars().first()
    row = TvcAcceptanceReport(
        task_id=task_id, gate=gate,
        template_id=UUID(template["id"]) if template and template.get("id") else None,
        template_snapshot=template,
        status=report.get("status", "unverified"), score=int(report.get("score", 0)),
        veto_hit=report.get("veto_hit", []), items=report.get("items", []),
        conflicts_top=report.get("conflicts_top", []), model_meta=report.get("model_meta", {}),
        redo_count=prev.redo_count if prev else 0,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return str(row.id)
