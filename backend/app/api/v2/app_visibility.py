"""
应用可见性配置 API
路由前缀: /api/v2/admin/app-visibility
读写配置文件: backend/app/config/app_visibility.json
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import json
import os
from datetime import datetime, timezone

from app.api.auth import require_admin
from app.models import User

router = APIRouter(prefix="/api/v2/admin/app-visibility", tags=["app-visibility"])

CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config")
CONFIG_FILE = os.path.join(CONFIG_DIR, "app_visibility.json")


class AppVisibilityPayload(BaseModel):
    workflowTemplates: Optional[dict] = None
    workflowNodes: Optional[dict] = None
    nano2Modules: Optional[dict] = None


def _read_config() -> dict:
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _write_config(data: dict) -> None:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    existing = _read_config()
    existing.update(data)
    existing["updated_at"] = datetime.now(timezone.utc).isoformat()
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)


@router.get("/config")
async def get_config(current_user: User = Depends(require_admin)):
    """获取应用可见性配置"""
    config = _read_config()
    return {
        "workflowTemplates": config.get("workflowTemplates", {}),
        "workflowNodes": config.get("workflowNodes", {}),
        "nano2Modules": config.get("nano2Modules", {}),
        "updated_at": config.get("updated_at", ""),
    }


@router.post("/config")
async def save_config(
    payload: AppVisibilityPayload,
    current_user: User = Depends(require_admin),
):
    """保存应用可见性配置"""
    data = {}
    if payload.workflowTemplates is not None:
        data["workflowTemplates"] = payload.workflowTemplates
    if payload.workflowNodes is not None:
        data["workflowNodes"] = payload.workflowNodes
    if payload.nano2Modules is not None:
        data["nano2Modules"] = payload.nano2Modules
    _write_config(data)
    return {"status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()}
