"""TVC 云端展示页（Showcase）— 免登录可分享的成片+参考图+验收报告页。

GET /showcase/tvc/{task_id}
- 公开只读（task_id 含随机 hex 不可枚举）
- 产物用资产库 COS 持久 URL（速创临时链失效后页面仍完整）
- 自包含 HTML（无外部依赖），暗色品牌风
"""
import json
import logging

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from app.database import async_session_maker
from app.models.asset import Asset
from app.models.tvc_acceptance import TvcAcceptanceReport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/showcase", tags=["showcase"])

_GATE_LABEL = {"script": "剧本审查", "final": "成片审查"}
_STATUS_META = {
    "passed": ("符合标准", "#10b981"),
    "failed": ("需修改", "#ef4444"),
    "unverified": ("待复核", "#f59e0b"),
}


def _fmt_score_ring(score: int, color: str) -> str:
    circumference = 2 * 3.14159 * 26
    dash = (min(100, max(0, score)) / 100) * circumference
    return (
        f'<svg viewBox="0 0 60 60" class="ring"><circle cx="30" cy="30" r="26" fill="none" '
        f'stroke="#1e293b" stroke-width="5"/><circle cx="30" cy="30" r="26" fill="none" '
        f'stroke="{color}" stroke-width="5" stroke-dasharray="{dash:.0f} {circumference:.0f}" '
        f'stroke-linecap="round" transform="rotate(-90 30 30)"/></svg>'
        f'<span class="score" style="color:{color}">{score}</span>'
    )


async def _collect(task_id: str) -> dict:
    """汇集展示数据：产物（assets COS URL 优先，Redis state 兜底）+ 报告 + 任务元信息。"""
    data = {"images": [], "videos": [], "bgm": "", "reports": [], "prompt": "", "theme": ""}

    async with async_session_maker() as db:
        rows = (await db.execute(
            select(Asset).where(Asset.meta_data["task_id"].astext == task_id)
            .order_by(Asset.created_at)
        )).scalars().all()
        for a in rows:
            if a.type == "image":
                data["images"].append({"name": a.name, "url": a.url})
            elif a.type == "video":
                if (a.meta_data or {}).get("asset_role") == "bgm":
                    data["bgm"] = a.url
                else:
                    data["videos"].append({"name": a.name, "url": a.url})
        reports = (await db.execute(
            select(TvcAcceptanceReport).where(TvcAcceptanceReport.task_id == task_id)
            .order_by(TvcAcceptanceReport.created_at)
        )).scalars().all()
        for r in reports:
            data["reports"].append({
                "gate": r.gate, "status": r.status, "score": r.score,
                "veto": r.veto_hit or [], "redo": r.redo_count,
                "conflicts": r.conflicts_top or [],
                "items": r.items or [],
            })

    if not data["videos"] and not data["images"]:
        # 兜底：Redis state 原始 URL（速创临时链）
        try:
            from app.services.workflow_executor import load_task
            state = await load_task(task_id)
            if state:
                for n in state.get("nodes", []):
                    if n.get("id") == "step-video":
                        for st in n.get("subtasks") or []:
                            u = ((st.get("result") or {}).get("video_url")) or ""
                            if u and st.get("id") != "bgm":
                                data["videos"].append({"name": "主视频", "url": u})
                            elif u:
                                data["bgm"] = u
                    if n.get("id") == "step-images":
                        for st in n.get("subtasks") or []:
                            u = ((st.get("result") or {}).get("image_url")) or ""
                            if u:
                                data["images"].append({"name": st.get("id", "ref"), "url": u})
                data["prompt"] = ((state.get("request") or {}).get("prompt") or "")[:300]
        except Exception as e:
            logger.warning(f"showcase redis fallback failed {task_id}: {e}")
    else:
        # 有资产时 prompt 从 Redis 补（可选）
        try:
            from app.services.workflow_executor import load_task
            state = await load_task(task_id)
            if state:
                data["prompt"] = ((state.get("request") or {}).get("prompt") or "")[:300]
        except Exception:
            pass
    return data


def _render_reports(reports: list[dict]) -> str:
    if not reports:
        return '<p class="muted">本单未关联验收标准（无审查报告）。</p>'
    out = []
    for r in reversed(reports):  # final 在前
        label = _GATE_LABEL.get(r["gate"], r["gate"])
        text, color = _STATUS_META.get(r["status"], (r["status"], "#f59e0b"))
        ring = _fmt_score_ring(r["score"], color)
        conflicts = "".join(
            f'<div class="conflict">⚠ <b>{c.get("label", c["key"])}</b>：{c.get("conflict", "")[:80]}</div>'
            for c in r["conflicts"] if c.get("key") != "_service"
        )
        items = "".join(
            f'<div class="item {"ok" if it.get("pass") else ("bad" if it.get("pass") is False else "na")}">'
            f'{"✓" if it.get("pass") else ("✕" if it.get("pass") is False else "–")} {it.get("label", it["key"])}'
            f'{" — " + it["conflict"][:70] if it.get("pass") is False and it.get("conflict") else ""}</div>'
            for it in r["items"] if it.get("category") != "archive"
        )
        out.append(f'''
        <div class="card">
          <div class="card-head">{ring}
            <div><div class="gate" style="color:{color}">{label} · {text}</div>
            <div class="muted">重做 {r["redo"]}/3 · 触发否决 {len(r["veto"])} 项</div></div>
          </div>
          <details><summary>检查明细</summary><div class="items">{items or "<span class='muted'>无</span>"}</div></details>
          {f'<div class="conflicts">{conflicts}</div>' if conflicts else ''}
        </div>''')
    return "".join(out)


@router.get("/tvc/{task_id}", response_class=HTMLResponse)
async def showcase(task_id: str):
    try:
        data = await _collect(task_id)
    except Exception as e:
        logger.warning(f"showcase collect failed {task_id}: {e}")
        data = {"images": [], "videos": [], "bgm": "", "reports": [], "prompt": "", "theme": ""}

    main_video = data["videos"][-1] if data["videos"] else None
    images = "".join(
        f'<figure><img src="{i["url"]}" loading="lazy" alt="{i["name"]}"><figcaption>{i["name"]}</figcaption></figure>'
        for i in data["images"]
    )
    extra_videos = "".join(
        f'<figure><video src="{v["url"]}" controls preload="metadata"></video><figcaption>{v["name"]}</figcaption></figure>'
        for v in data["videos"][:-1]
    )
    bgm = (
        f'<figure><video src="{data["bgm"]}" controls muted preload="metadata"></video>'
        f'<figcaption>BGM 氛围镜头</figcaption></figure>' if data["bgm"] else ""
    )
    prompt_html = (
        f'<div class="prompt"><span class="muted">创意输入：</span>{data["prompt"]}</div>' if data["prompt"] else ""
    )
    html = f'''<!DOCTYPE html>
<html lang="zh"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TVC 展示 · {task_id}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#0f172a; color:#e2e8f0; font-family:-apple-system,'PingFang SC',sans-serif; padding:32px 16px; }}
  .wrap {{ max-width:1100px; margin:0 auto; }}
  h1 {{ font-size:20px; margin:0 0 4px; }}
  h2 {{ font-size:14px; color:#94a3b8; margin:28px 0 12px; font-weight:600; }}
  .brand {{ color:#3b82f6; }}
  .grid {{ display:flex; gap:20px; flex-wrap:wrap; }}
  .main {{ flex:0 0 380px; }}
  .main video {{ width:100%; border-radius:14px; border:1px solid #334155; background:#000; }}
  .side {{ flex:1; min-width:280px; }}
  figure {{ margin:0 0 14px; }}
  img, .side video {{ width:100%; border-radius:10px; border:1px solid #334155; }}
  figcaption {{ font-size:11px; color:#94a3b8; margin-top:4px; }}
  .card {{ background:rgba(255,255,255,.03); border:1px solid #1e293b; border-radius:12px; padding:14px; margin-bottom:14px; }}
  .card-head {{ display:flex; gap:12px; align-items:center; }}
  .ring {{ width:52px; height:52px; }}
  .score {{ position:absolute; font-size:15px; font-weight:700; }}
  .card-head > div:first-child {{ position:relative; width:52px; height:52px; flex:0 0 52px; }}
  .score {{ top:16px; left:0; width:52px; text-align:center; }}
  .gate {{ font-size:14px; font-weight:600; }}
  .muted {{ color:#94a3b8; font-size:12px; }}
  .conflict {{ font-size:12px; color:#fca5a5; margin-top:6px; }}
  .item {{ font-size:12px; padding:2px 0; }}
  .item.ok {{ color:#6ee7b7; }} .item.bad {{ color:#fca5a5; }} .item.na {{ color:#94a3b8; }}
  details {{ margin-top:8px; }} summary {{ cursor:pointer; font-size:12px; color:#94a3b8; }}
  .prompt {{ font-size:12px; color:#cbd5e1; background:rgba(255,255,255,.03); border:1px solid #1e293b;
             border-radius:10px; padding:10px 12px; margin:14px 0; line-height:1.6; }}
  .empty {{ color:#94a3b8; padding:40px; text-align:center; }}
</style></head><body><div class="wrap">
  <h1><span class="brand">KFC</span> TVC 展示 · <span style="font-weight:400">法风烧饼系列</span></h1>
  <p class="muted">任务 {task_id} · 由 NanoAI Canvas 一镜到底工作流生成 · 验收标准审查闸出具报告</p>
  {prompt_html}
  <h2>成片</h2>
  {'<div class="grid"><div class="main">' + (f'<video src="{main_video["url"]}" controls autoplay loop playsinline></video><p class="muted">{main_video["name"]}</p>' if main_video else '<div class="empty">无成片</div>') + '</div><div class="side">' + extra_videos + bgm + '</div></div>'}
  <h2>参考图</h2>
  {'<div class="grid">' + (images or '<p class="muted">无</p>') + '</div>'}
  <h2>验收报告</h2>
  {_render_reports(data["reports"])}
  <p class="muted" style="margin-top:32px">Powered by NanoAiCanvas · app.nanoai.fun/nanoai</p>
</div></body></html>'''
    return HTMLResponse(content=html)
