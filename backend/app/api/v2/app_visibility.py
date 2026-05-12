"""
应用可见性配置 API（数据库版本）
路由前缀: /api/v2/admin/app-visibility
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database import get_db
from app.models.app_visibility import AppVisibilityItem, VisibilityAuditLog
from app.api.auth import require_admin
from app.models import User

router = APIRouter(prefix="/api/v2/admin/app-visibility", tags=["app-visibility"])


# ============ Schemas ============

class VisibilityItemCreate(BaseModel):
    scope: str          # template / node / nano2_module
    item_id: str
    item_name: str = ""
    description: str = ""
    category: str = ""
    visibility: str = "disabled"

class VisibilityItemUpdate(BaseModel):
    visibility: str

class BatchUpdateItem(BaseModel):
    item_id: str
    visibility: str

class BatchUpdateRequest(BaseModel):
    scope: str
    items: List[BatchUpdateItem]

class ResetRequest(BaseModel):
    scope: str  # template / node / nano2_module / all


# ============ 默认配置（用于首次初始化和重置） ============

DEFAULT_TEMPLATES = [
    {"item_id": "storyboard-shot-a-workflow", "item_name": "故事板分镜V1版", "description": "输入描述→提示词优化→生成分镜图→预览/保存", "category": "storyboard", "visibility": "active"},
    {"item_id": "storyboard-v2-workflow", "item_name": "故事板分镜V2版", "description": "剧本生成→分镜头参考图+人物角色设计+场景设计+脚本表格", "category": "storyboard", "visibility": "active"},
    {"item_id": "storyboard-complete", "item_name": "完整故事板生成", "description": "从文案到完整故事板的4步流程", "category": "script", "visibility": "disabled"},
    {"item_id": "character-design", "item_name": "角色设计工作流", "description": "快速生成角色设计图", "category": "character", "visibility": "disabled"},
    {"item_id": "scene-design", "item_name": "场景设计工作流", "description": "快速生成场景设计图", "category": "scene", "visibility": "disabled"},
    {"item_id": "storyboard-01", "item_name": "故事板01", "description": "完整的故事板生成工作流：9步流程", "category": "story", "visibility": "disabled"},
    {"item_id": "character-workflow", "item_name": "角色设计工作流", "description": "从文案到角色设计的完整流程", "category": "character", "visibility": "disabled"},
    {"item_id": "scene-workflow", "item_name": "场景设计工作流", "description": "快速创建场景设计图", "category": "scene", "visibility": "disabled"},
    {"item_id": "quick-storyboard-v2", "item_name": "快速分镜", "description": "3步快速生成分镜图片", "category": "storyboard", "visibility": "disabled"},
    {"item_id": "dual-line-character-design", "item_name": "双线角色设计", "description": "双模型并行图片生成+预览对比", "category": "image", "visibility": "disabled"},
    {"item_id": "skills-ui-mockups", "item_name": "Skills: UI原型", "description": "UI/UX 模型生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-product-visuals", "item_name": "Skills: 产品视觉", "description": "产品展示图生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-maps", "item_name": "Skills: 地图", "description": "地图可视化生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-slides", "item_name": "Skills: 幻灯片", "description": "演示文稿生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-poster", "item_name": "Skills: 海报", "description": "海报设计生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-portraits", "item_name": "Skills: 人像", "description": "人像照片生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-scenes", "item_name": "Skills: 场景", "description": "场景图片生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-editing", "item_name": "Skills: 编辑", "description": "图片编辑处理", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-avatars", "item_name": "Skills: 头像", "description": "头像生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-storyboards", "item_name": "Skills: 故事板", "description": "故事板生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-grids", "item_name": "Skills: 网格", "description": "网格布局图生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-branding", "item_name": "Skills: 品牌", "description": "品牌视觉生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-typography", "item_name": "Skills: 排版", "description": "排版设计生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-assets", "item_name": "Skills: 资产", "description": "素材资产生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-academic", "item_name": "Skills: 学术", "description": "学术图表生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-infographics", "item_name": "Skills: 信息图", "description": "信息图生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-technical", "item_name": "Skills: 技术", "description": "技术图表生成", "category": "skills", "visibility": "disabled"},
    {"item_id": "skills-complete", "item_name": "Skills: 完整流程", "description": "通用完整 Skills 工作流", "category": "skills", "visibility": "disabled"},
]

DEFAULT_NODES = [
    {"item_id": "input_text", "item_name": "文本输入", "description": "文本内容输入", "category": "输入", "visibility": "active"},
    {"item_id": "input_image", "item_name": "图片输入", "description": "图片内容输入", "category": "输入", "visibility": "disabled"},
    {"item_id": "storyboard_shot_a", "item_name": "故事板分镜V1版", "description": "输入描述→优化提示词→生成分镜图", "category": "故事板分镜", "visibility": "active"},
    {"item_id": "storyboard_v2", "item_name": "故事板分镜V2版", "description": "智能分镜节点", "category": "故事板分镜", "visibility": "active"},
    {"item_id": "shot_ref_image", "item_name": "分镜头参考图", "description": "生成分镜头参考图", "category": "故事板分镜", "visibility": "active"},
    {"item_id": "character_design_image", "item_name": "人物角色设计图", "description": "生成人物角色设计图", "category": "故事板分镜", "visibility": "active"},
    {"item_id": "scene_design_image", "item_name": "场景设计图", "description": "生成场景设计图", "category": "故事板分镜", "visibility": "active"},
    {"item_id": "script_table", "item_name": "分镜头脚本表格", "description": "展示分镜头脚本", "category": "故事板分镜", "visibility": "active"},
    {"item_id": "script_generator", "item_name": "脚本生成", "description": "生成故事脚本", "category": "AI生成", "visibility": "disabled"},
    {"item_id": "storyboard_generator", "item_name": "分镜头生成", "description": "生成分镜图片", "category": "AI生成", "visibility": "disabled"},
    {"item_id": "dialogue_generator", "item_name": "对白生成", "description": "生成语音", "category": "AI生成", "visibility": "disabled"},
    {"item_id": "character_designer", "item_name": "角色设计", "description": "生成角色设计图", "category": "AI生成", "visibility": "disabled"},
    {"item_id": "scene_designer", "item_name": "场景设计", "description": "生成场景设计图", "category": "AI生成", "visibility": "disabled"},
    {"item_id": "director_agent", "item_name": "导演Agent", "description": "智能决策和流程控制", "category": "决策", "visibility": "disabled"},
    {"item_id": "screenwriter_agent", "item_name": "编剧Agent", "description": "创意处理和内容优化", "category": "决策", "visibility": "disabled"},
    {"item_id": "text_processor", "item_name": "文本处理器", "description": "文本内容处理", "category": "处理", "visibility": "disabled"},
    {"item_id": "image_processor", "item_name": "图片处理器", "description": "图片内容处理", "category": "处理", "visibility": "disabled"},
    {"item_id": "data_transformer", "item_name": "数据转换", "description": "数据格式转换", "category": "处理", "visibility": "disabled"},
    {"item_id": "milestone", "item_name": "里程碑", "description": "预览成果展示", "category": "其他", "visibility": "disabled"},
    {"item_id": "output_preview", "item_name": "结果预览", "description": "通用结果预览", "category": "输出", "visibility": "disabled"},
    {"item_id": "output_export", "item_name": "结果导出", "description": "导出结果", "category": "输出", "visibility": "disabled"},
    {"item_id": "output_save", "item_name": "结果保存", "description": "保存结果", "category": "输出", "visibility": "disabled"},
    {"item_id": "minimax_text", "item_name": "MiniMax文本", "description": "MiniMax文本生成", "category": "MiniMax", "visibility": "disabled"},
    {"item_id": "minimax_speech", "item_name": "MiniMax语音", "description": "MiniMax语音合成", "category": "MiniMax", "visibility": "disabled"},
    {"item_id": "minimax_video", "item_name": "MiniMax视频", "description": "MiniMax视频生成", "category": "MiniMax", "visibility": "disabled"},
    {"item_id": "minimax_music", "item_name": "MiniMax音乐", "description": "MiniMax音乐生成", "category": "MiniMax", "visibility": "disabled"},
    {"item_id": "minimax_image", "item_name": "MiniMax图片", "description": "MiniMax图片生成", "category": "MiniMax", "visibility": "disabled"},
    {"item_id": "minimax_coding", "item_name": "MiniMax编程", "description": "MiniMax编程搜索", "category": "MiniMax", "visibility": "disabled"},
    {"item_id": "nano_banana_2", "item_name": "NanoBanana2", "description": "NanoBanana2图片生成", "category": "图片生成", "visibility": "disabled"},
    {"item_id": "nano_banana_pro", "item_name": "NanoBananaPro", "description": "NanoBananaPro图片生成", "category": "图片生成", "visibility": "disabled"},
    {"item_id": "gpt_image_2", "item_name": "GPT-Image-2", "description": "GPT-Image-2图片生成", "category": "图片生成", "visibility": "disabled"},
    {"item_id": "jimeng_image", "item_name": "即梦图片", "description": "即梦AI图片生成", "category": "即梦", "visibility": "disabled"},
    {"item_id": "jimeng_video", "item_name": "即梦视频", "description": "即梦AI视频生成", "category": "即梦", "visibility": "disabled"},
    {"item_id": "glm_text", "item_name": "智谱文本", "description": "智谱GLM文本生成", "category": "智谱GLM", "visibility": "disabled"},
    {"item_id": "glm_video", "item_name": "智谱视频", "description": "智谱GLM视频生成（CogVideoX-3）", "category": "智谱GLM", "visibility": "enabled"},
    {"item_id": "glm_tts", "item_name": "智谱TTS", "description": "智谱GLM语音合成", "category": "智谱GLM", "visibility": "disabled"},
    {"item_id": "glm_multimodal", "item_name": "智谱多模态", "description": "智谱GLM多模态理解", "category": "智谱GLM", "visibility": "disabled"},
    {"item_id": "qwen_text", "item_name": "通义文本", "description": "通义千问文本生成", "category": "通义千问", "visibility": "disabled"},
    {"item_id": "qwen_coding", "item_name": "通义代码", "description": "通义千问代码生成", "category": "通义千问", "visibility": "disabled"},
    {"item_id": "kimi_text", "item_name": "Kimi文本", "description": "Kimi文本生成", "category": "Kimi", "visibility": "disabled"},
    {"item_id": "image_preview", "item_name": "图片预览", "description": "展示图片结果", "category": "预览", "visibility": "active"},
    {"item_id": "video_preview", "item_name": "视频预览", "description": "展示视频结果", "category": "预览", "visibility": "disabled"},
    {"item_id": "audio_preview", "item_name": "音频预览", "description": "展示音频结果", "category": "预览", "visibility": "disabled"},
    {"item_id": "text_preview", "item_name": "文本预览", "description": "展示文本结果", "category": "预览", "visibility": "disabled"},
    {"item_id": "output_node", "item_name": "输出/保存", "description": "保存到资产库/下载", "category": "输出", "visibility": "active"},
    {"item_id": "skills_data", "item_name": "Skills数据", "description": "Skills数据输入", "category": "Skills", "visibility": "disabled"},
    {"item_id": "skills_task", "item_name": "Skills任务", "description": "Skills任务执行", "category": "Skills", "visibility": "disabled"},
]

DEFAULT_NANO2_MODULES = [
    {"item_id": "text-to-image", "item_name": "文生图", "description": "文本描述生成图片", "category": "生图模式", "visibility": "active"},
    {"item_id": "fusion", "item_name": "融图模式", "description": "多图融合生成", "category": "生图模式", "visibility": "active"},
    {"item_id": "reference", "item_name": "参考图模式", "description": "参考图生成", "category": "生图模式", "visibility": "active"},
    {"item_id": "ai-skill", "item_name": "AI Skill", "description": "AI技能模板面板", "category": "生图模式", "visibility": "active"},
    {"item_id": "prompt-enhance", "item_name": "提示词优化", "description": "提示词优化增强", "category": "工具", "visibility": "active"},
    {"item_id": "prompt-template", "item_name": "提示词模板", "description": "提示词模板管理", "category": "工具", "visibility": "active"},
    {"item_id": "prompt-wizard", "item_name": "智能生成", "description": "香蕉哥哥智能生成", "category": "工具", "visibility": "active"},
    {"item_id": "batch-task", "item_name": "批量任务", "description": "批量图片生成", "category": "工具", "visibility": "active"},
    {"item_id": "knowledge-card", "item_name": "知识卡片", "description": "知识卡片生成", "category": "辅助", "visibility": "active"},
    {"item_id": "character-design", "item_name": "人物角色", "description": "人物角色设计", "category": "辅助", "visibility": "active"},
    {"item_id": "ecommerce-product", "item_name": "电商产品", "description": "电商产品图生成", "category": "辅助", "visibility": "active"},
    {"item_id": "architecture", "item_name": "建筑效果图", "description": "建筑效果图生成", "category": "辅助", "visibility": "active"},
    {"item_id": "voice", "item_name": "语音对话", "description": "实时语音对话", "category": "辅助", "visibility": "active"},
    {"item_id": "storyboard", "item_name": "故事板", "description": "故事板分镜生成", "category": "辅助", "visibility": "active"},
    {"item_id": "banana-brother", "item_name": "香蕉哥哥", "description": "提示词生成助手", "category": "辅助", "visibility": "active"},
]

ALL_DEFAULTS = {
    "template": DEFAULT_TEMPLATES,
    "node": DEFAULT_NODES,
    "nano2_module": DEFAULT_NANO2_MODULES,
}


# ============ Helpers ============

def _item_to_dict(item: AppVisibilityItem) -> dict:
    return {
        "id": item.id,
        "scope": item.scope,
        "item_id": item.item_id,
        "item_name": item.item_name,
        "description": item.description,
        "category": item.category,
        "visibility": item.visibility,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def _audit_to_dict(log: VisibilityAuditLog) -> dict:
    return {
        "id": log.id,
        "admin_id": log.admin_id,
        "admin_name": log.admin_name,
        "scope": log.scope,
        "action": log.action,
        "changes": log.changes,
        "snapshot": log.snapshot,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


async def _ensure_defaults(scope: str, db: AsyncSession):
    """确保指定 scope 的默认项已初始化到数据库"""
    defaults = ALL_DEFAULTS.get(scope, [])
    if not defaults:
        return
    # 先查询已存在的 item_id
    stmt = select(AppVisibilityItem.item_id).where(AppVisibilityItem.scope == scope)
    result = await db.execute(stmt)
    existing_ids = {r[0] for r in result.all()}
    for d in defaults:
        if d["item_id"] not in existing_ids:
            item = AppVisibilityItem(scope=scope, **d)
            db.add(item)
    await db.commit()


async def _write_audit(
    db: AsyncSession,
    admin: User,
    scope: str,
    action: str,
    changes: list | None = None,
    snapshot: dict | None = None,
):
    log = VisibilityAuditLog(
        admin_id=str(admin.id) if admin else None,
        admin_name=admin.username if admin else "system",
        scope=scope,
        action=action,
        changes=changes,
        snapshot=snapshot,
    )
    db.add(log)
    await db.commit()


# ============ 初始化（首次启动自动 seed） ============

@router.post("/seed")
async def seed_defaults(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """初始化默认配置到数据库（幂等，已有项跳过）"""
    for scope in ALL_DEFAULTS:
        await _ensure_defaults(scope, db)
    return {"status": "ok", "message": "默认配置已初始化"}


# ============ 查询配置 ============

@router.get("/config")
async def get_config(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取所有可见性配置，按 scope 分组返回"""
    for scope in ALL_DEFAULTS:
        await _ensure_defaults(scope, db)

    stmt = select(AppVisibilityItem).order_by(AppVisibilityItem.scope, AppVisibilityItem.id)
    result = await db.execute(stmt)
    items = result.scalars().all()

    grouped = {"template": {}, "node": {}, "nano2_module": {}}
    for item in items:
        grouped.setdefault(item.scope, {})[item.item_id] = item.visibility

    return {
        "workflowTemplates": grouped.get("template", {}),
        "workflowNodes": grouped.get("node", {}),
        "nano2Modules": grouped.get("nano2_module", {}),
    }


# ============ 单项更新 ============

@router.patch("/items/{scope}/{item_id}")
async def update_item(
    scope: str,
    item_id: str,
    data: VisibilityItemUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """更新单个项目的可见性"""
    stmt = select(AppVisibilityItem).where(
        and_(AppVisibilityItem.scope == scope, AppVisibilityItem.item_id == item_id)
    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(404, f"项目 {scope}/{item_id} 不存在")

    old_visibility = item.visibility
    item.visibility = data.visibility
    await db.commit()
    await db.refresh(item)

    await _write_audit(db, admin, scope, "update", [
        {"item_id": item_id, "item_name": item.item_name, "old": old_visibility, "new": data.visibility}
    ])

    return _item_to_dict(item)


# ============ 批量更新 ============

@router.post("/batch")
async def batch_update(
    data: BatchUpdateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """批量更新多个项目的可见性"""
    changes = []
    for update in data.items:
        stmt = select(AppVisibilityItem).where(
            and_(AppVisibilityItem.scope == data.scope, AppVisibilityItem.item_id == update.item_id)
        )
        item = (await db.execute(stmt)).scalar_one_or_none()
        if item and item.visibility != update.visibility:
            changes.append({
                "item_id": item.item_id,
                "item_name": item.item_name,
                "old": item.visibility,
                "new": update.visibility,
            })
            item.visibility = update.visibility

    await db.commit()

    if changes:
        await _write_audit(db, admin, data.scope, "batch_update", changes)

    return {"updated": len(changes)}


# ============ 保存完整配置（兼容旧接口） ============

@router.post("/config")
async def save_config(
    payload: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """保存完整可见性配置（兼容旧 JSON 接口格式）"""
    scope_map = {
        "workflowTemplates": "template",
        "workflowNodes": "node",
        "nano2Modules": "nano2_module",
    }

    all_changes = []
    for key, scope in scope_map.items():
        config_data = payload.get(key)
        if not config_data:
            continue

        await _ensure_defaults(scope, db)

        for item_id, visibility in config_data.items():
            stmt = select(AppVisibilityItem).where(
                and_(AppVisibilityItem.scope == scope, AppVisibilityItem.item_id == item_id)
            )
            item = (await db.execute(stmt)).scalar_one_or_none()
            if item and item.visibility != visibility:
                all_changes.append({
                    "item_id": item.item_id,
                    "item_name": item.item_name,
                    "old": item.visibility,
                    "new": visibility,
                })
                item.visibility = visibility

    await db.commit()

    if all_changes:
        await _write_audit(db, admin, "all", "batch_update", all_changes)

    return {"status": "ok"}


# ============ 重置 ============

@router.post("/reset")
async def reset_config(
    data: ResetRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """重置指定 scope 为默认值"""
    scopes = [data.scope] if data.scope != "all" else list(ALL_DEFAULTS.keys())
    changes = []

    for scope in scopes:
        defaults = ALL_DEFAULTS.get(scope, [])
        for d in defaults:
            stmt = select(AppVisibilityItem).where(
                and_(AppVisibilityItem.scope == scope, AppVisibilityItem.item_id == d["item_id"])
            )
            item = (await db.execute(stmt)).scalar_one_or_none()
            if item:
                if item.visibility != d["visibility"]:
                    changes.append({
                        "item_id": item.item_id,
                        "item_name": item.item_name,
                        "old": item.visibility,
                        "new": d["visibility"],
                    })
                    item.visibility = d["visibility"]

    await db.commit()

    if changes:
        await _write_audit(db, admin, data.scope, "reset", changes)

    return {"reset": len(changes)}


# ============ 审计日志查询 ============

@router.get("/audit-log")
async def get_audit_log(
    scope: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """查询审计日志"""
    base_stmt = select(VisibilityAuditLog)
    count_stmt = select(func.count(VisibilityAuditLog.id))

    if scope and scope != "all":
        base_stmt = base_stmt.where(VisibilityAuditLog.scope == scope)
        count_stmt = count_stmt.where(VisibilityAuditLog.scope == scope)

    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = base_stmt.order_by(VisibilityAuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return {
        "data": [_audit_to_dict(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ============ 统计概览 ============

@router.get("/stats")
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取各 scope 的可见性统计"""
    for scope in ALL_DEFAULTS:
        await _ensure_defaults(scope, db)

    stats = {}
    for scope in ["template", "node", "nano2_module"]:
        stmt = select(AppVisibilityItem.visibility, func.count()).where(
            AppVisibilityItem.scope == scope
        ).group_by(AppVisibilityItem.visibility)
        result = await db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}

        stats[scope] = {
            "total": sum(counts.values()),
            "active": counts.get("active", 0),
            "disabled": counts.get("disabled", 0),
            "hidden": counts.get("hidden", 0),
        }

    return stats
