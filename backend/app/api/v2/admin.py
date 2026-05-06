"""
Admin CRUD API — 渠道商/模型/密钥/用量统计/健康检查
路由前缀: /api/v2/admin
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.models.api_key import Provider, Model, ModelUsageLog, APIKey

router = APIRouter(prefix="/api/v2/admin", tags=["admin"])


# ============ Pydantic Schemas ============

class ProviderCreate(BaseModel):
    name: str
    code: str
    api_base_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    config: Optional[dict] = None

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    api_base_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[dict] = None

class ProviderOut(BaseModel):
    id: int
    name: str
    code: str
    api_base_url: Optional[str]
    description: Optional[str]
    website: Optional[str]
    is_active: bool
    config: Optional[dict]
    model_count: int = 0
    active_key_count: int = 0
    created_at: Optional[datetime] = None

class ModelCreate(BaseModel):
    name: str
    code: str
    model_type: str
    category: Optional[str] = None
    points_per_call: int = 0
    points_per_token: int = 0
    is_active: bool = True
    config: Optional[dict] = None

class ModelUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    model_type: Optional[str] = None
    category: Optional[str] = None
    points_per_call: Optional[int] = None
    points_per_token: Optional[int] = None
    is_active: Optional[bool] = None
    config: Optional[dict] = None

class ModelOut(BaseModel):
    id: int
    name: str
    code: str
    provider_id: int
    model_type: str
    category: Optional[str]
    points_per_call: int
    points_per_token: int
    is_active: bool
    config: Optional[dict]
    created_at: Optional[datetime] = None

class APIKeyCreate(BaseModel):
    provider_id: int
    name: str
    api_key: str
    daily_limit: int = 0
    monthly_limit: int = 0
    priority: int = 0
    weight: int = 1
    max_concurrent: int = 10
    expires_at: Optional[datetime] = None

class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    status: Optional[str] = None
    daily_limit: Optional[int] = None
    monthly_limit: Optional[int] = None
    priority: Optional[int] = None
    weight: Optional[int] = None
    max_concurrent: Optional[int] = None
    expires_at: Optional[datetime] = None

class APIKeyOut(BaseModel):
    id: int
    provider_id: int
    name: str
    status: str
    daily_limit: int
    monthly_limit: int
    used_today: int
    used_this_month: int
    total_used: int
    priority: int
    weight: int
    max_concurrent: int
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    last_test_at: Optional[datetime] = None
    last_test_success: Optional[bool] = None
    key_preview: str = ""
    created_at: Optional[datetime] = None

class ToggleRequest(BaseModel):
    is_active: bool

class UsageSummary(BaseModel):
    model_id: int
    model_name: str
    model_code: str
    model_type: str
    provider_name: str
    total_calls: int
    success_calls: int
    failed_calls: int
    avg_response_ms: Optional[float]
    last_used_at: Optional[datetime]


# ============ Helper ============

def _provider_to_out(p: Provider, model_count: int = 0, key_count: int = 0) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "code": p.code,
        "api_base_url": p.api_base_url,
        "description": p.description,
        "website": p.website,
        "is_active": p.is_active,
        "config": p.config,
        "model_count": model_count,
        "active_key_count": key_count,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

def _model_to_out(m: Model) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "code": m.code,
        "provider_id": m.provider_id,
        "model_type": m.model_type,
        "category": m.category,
        "points_per_call": m.points_per_call,
        "points_per_token": m.points_per_token,
        "is_active": m.is_active,
        "config": m.config,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }

def _apikey_to_out(k: APIKey) -> dict:
    raw = k.api_key or ""
    preview = raw[:8] + "..." + raw[-4:] if len(raw) > 12 else "***"
    return {
        "id": k.id,
        "provider_id": k.provider_id,
        "name": k.name,
        "status": k.status,
        "daily_limit": k.daily_limit,
        "monthly_limit": k.monthly_limit,
        "used_today": k.used_today,
        "used_this_month": k.used_this_month,
        "total_used": k.total_used,
        "priority": k.priority,
        "weight": k.weight,
        "max_concurrent": k.max_concurrent,
        "expires_at": k.expires_at.isoformat() if k.expires_at else None,
        "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        "last_test_at": k.last_test_at.isoformat() if k.last_test_at else None,
        "last_test_success": k.last_test_success,
        "key_preview": preview,
        "created_at": k.created_at.isoformat() if k.created_at else None,
    }


# ============ 渠道商 CRUD ============

@router.get("/providers", response_model=List[ProviderOut])
async def list_providers(db: AsyncSession = Depends(get_db)):
    stmt = select(Provider).options(
        selectinload(Provider.models),
        selectinload(Provider.api_keys),
    ).order_by(Provider.id)
    result = await db.execute(stmt)
    providers = result.scalars().all()

    out = []
    for p in providers:
        mc = len([m for m in p.models if m.is_active])
        kc = len([k for k in p.api_keys if k.status == "active"])
        out.append(_provider_to_out(p, mc, kc))
    return out


@router.post("/providers", response_model=ProviderOut)
async def create_provider(data: ProviderCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Provider).where(Provider.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"渠道商代码 '{data.code}' 已存在")
    p = Provider(**data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _provider_to_out(p)


@router.get("/providers/{provider_id}", response_model=ProviderOut)
async def get_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "渠道商不存在")
    mc_stmt = select(func.count()).where(and_(Model.provider_id == provider_id, Model.is_active == True))
    kc_stmt = select(func.count()).where(and_(APIKey.provider_id == provider_id, APIKey.status == "active"))
    mc = (await db.execute(mc_stmt)).scalar() or 0
    kc = (await db.execute(kc_stmt)).scalar() or 0
    return _provider_to_out(p, mc, kc)


@router.put("/providers/{provider_id}", response_model=ProviderOut)
async def update_provider(provider_id: int, data: ProviderUpdate, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "渠道商不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return _provider_to_out(p)


@router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "渠道商不存在")
    await db.delete(p)
    await db.commit()
    return {"message": "已删除"}


@router.post("/providers/{provider_id}/toggle")
async def toggle_provider(provider_id: int, data: ToggleRequest, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "渠道商不存在")
    p.is_active = data.is_active
    await db.commit()
    return {"is_active": p.is_active}


# ============ 模型 CRUD ============

@router.get("/providers/{provider_id}/models", response_model=List[ModelOut])
async def list_models(provider_id: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "渠道商不存在")
    stmt = select(Model).where(Model.provider_id == provider_id).order_by(Model.id)
    result = await db.execute(stmt)
    return [_model_to_out(m) for m in result.scalars().all()]


@router.post("/providers/{provider_id}/models", response_model=ModelOut)
async def create_model(provider_id: int, data: ModelCreate, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, provider_id)
    if not p:
        raise HTTPException(404, "渠道商不存在")
    m = Model(provider_id=provider_id, **data.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _model_to_out(m)


@router.put("/providers/{provider_id}/models/{model_id}", response_model=ModelOut)
async def update_model(provider_id: int, model_id: int, data: ModelUpdate, db: AsyncSession = Depends(get_db)):
    m = await db.get(Model, model_id)
    if not m or m.provider_id != provider_id:
        raise HTTPException(404, "模型不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return _model_to_out(m)


@router.delete("/providers/{provider_id}/models/{model_id}")
async def delete_model(provider_id: int, model_id: int, db: AsyncSession = Depends(get_db)):
    m = await db.get(Model, model_id)
    if not m or m.provider_id != provider_id:
        raise HTTPException(404, "模型不存在")
    await db.delete(m)
    await db.commit()
    return {"message": "已删除"}


@router.post("/providers/{provider_id}/models/{model_id}/toggle")
async def toggle_model(provider_id: int, model_id: int, data: ToggleRequest, db: AsyncSession = Depends(get_db)):
    m = await db.get(Model, model_id)
    if not m or m.provider_id != provider_id:
        raise HTTPException(404, "模型不存在")
    m.is_active = data.is_active
    await db.commit()
    return {"is_active": m.is_active}


# ============ API 密钥 CRUD ============

@router.get("/api-keys", response_model=List[APIKeyOut])
async def list_api_keys(
    provider_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(APIKey)
    if provider_id:
        stmt = stmt.where(APIKey.provider_id == provider_id)
    if status:
        stmt = stmt.where(APIKey.status == status)
    stmt = stmt.order_by(APIKey.priority.desc(), APIKey.id)
    result = await db.execute(stmt)
    return [_apikey_to_out(k) for k in result.scalars().all()]


@router.get("/api-keys/{key_id}", response_model=APIKeyOut)
async def get_api_key(key_id: int, db: AsyncSession = Depends(get_db)):
    k = await db.get(APIKey, key_id)
    if not k:
        raise HTTPException(404, "密钥不存在")
    return _apikey_to_out(k)


@router.post("/api-keys", response_model=APIKeyOut)
async def create_api_key(data: APIKeyCreate, db: AsyncSession = Depends(get_db)):
    p = await db.get(Provider, data.provider_id)
    if not p:
        raise HTTPException(400, "渠道商不存在")
    k = APIKey(**data.model_dump())
    db.add(k)
    await db.commit()
    await db.refresh(k)
    return _apikey_to_out(k)


@router.put("/api-keys/{key_id}", response_model=APIKeyOut)
async def update_api_key(key_id: int, data: APIKeyUpdate, db: AsyncSession = Depends(get_db)):
    k = await db.get(APIKey, key_id)
    if not k:
        raise HTTPException(404, "密钥不存在")
    for field, v in data.model_dump(exclude_unset=True).items():
        setattr(k, field, v)
    await db.commit()
    await db.refresh(k)
    return _apikey_to_out(k)


@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: int, db: AsyncSession = Depends(get_db)):
    k = await db.get(APIKey, key_id)
    if not k:
        raise HTTPException(404, "密钥不存在")
    await db.delete(k)
    await db.commit()
    return {"message": "已删除"}


@router.post("/api-keys/{key_id}/test")
async def test_api_key(key_id: int, db: AsyncSession = Depends(get_db)):
    k = await db.get(APIKey, key_id)
    if not k:
        raise HTTPException(404, "密钥不存在")

    import time
    start = time.time()
    success = False
    error_msg = None

    try:
        p = await db.get(Provider, k.provider_id)
        if p and p.api_base_url:
            import httpx
            async with httpx.AsyncClient(timeout=10) as http:
                url = f"{p.api_base_url.rstrip('/')}/models" if p.api_base_url else ""
                if url:
                    resp = await http.get(url, headers={"Authorization": f"Bearer {k.api_key}"})
                    success = resp.status_code == 200
                    if not success:
                        error_msg = f"HTTP {resp.status_code}"
    except Exception as e:
        error_msg = str(e)[:200]

    elapsed_ms = int((time.time() - start) * 1000)
    k.last_test_at = datetime.utcnow()
    k.last_test_success = success
    await db.commit()

    return {
        "is_success": success,
        "response_time_ms": elapsed_ms,
        "error_message": error_msg,
    }


@router.post("/api-keys/{key_id}/load-balance")
async def update_load_balance(
    key_id: int,
    weight: int = Query(1, ge=1, le=100),
    max_concurrent: int = Query(10, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    k = await db.get(APIKey, key_id)
    if not k:
        raise HTTPException(404, "密钥不存在")
    k.weight = weight
    k.max_concurrent = max_concurrent
    await db.commit()
    return {"weight": k.weight, "max_concurrent": k.max_concurrent}


@router.get("/api-keys/statistics/summary")
async def get_key_statistics(
    provider_id: Optional[int] = None,
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    stmt = select(
        ModelUsageLog.api_key_id,
        func.count().label("total_calls"),
        func.sum(case((ModelUsageLog.status == "success", 1), else_=0)).label("success"),
        func.avg(ModelUsageLog.response_time_ms).label("avg_ms"),
    ).where(ModelUsageLog.created_at >= since)

    if provider_id:
        stmt = stmt.where(ModelUsageLog.provider_id == provider_id)

    stmt = stmt.group_by(ModelUsageLog.api_key_id)
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "api_key_id": r[0],
            "total_calls": r[1],
            "success_calls": r[2] or 0,
            "avg_response_ms": round(r[3], 1) if r[3] else 0,
        }
        for r in rows
    ]


# ============ 用量统计 ============

@router.get("/models/usage", response_model=List[UsageSummary])
async def get_models_usage(
    days: int = Query(7, ge=1, le=90),
    provider_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    stmt = (
        select(
            Model.id.label("model_id"),
            Model.name.label("model_name"),
            Model.code.label("model_code"),
            Model.model_type,
            Provider.name.label("provider_name"),
            func.count().label("total_calls"),
            func.sum(case((ModelUsageLog.status == "success", 1), else_=0)).label("success_calls"),
            func.sum(case((ModelUsageLog.status != "success", 1), else_=0)).label("failed_calls"),
            func.avg(ModelUsageLog.response_time_ms).label("avg_response_ms"),
            func.max(ModelUsageLog.created_at).label("last_used_at"),
        )
        .join(ModelUsageLog, ModelUsageLog.model_id == Model.id)
        .join(Provider, Provider.id == Model.provider_id)
        .where(ModelUsageLog.created_at >= since)
    )

    if provider_id:
        stmt = stmt.where(Model.provider_id == provider_id)

    stmt = stmt.group_by(Model.id, Model.name, Model.code, Model.model_type, Provider.name)
    stmt = stmt.order_by(func.count().desc())

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "model_id": r.model_id,
            "model_name": r.model_name,
            "model_code": r.model_code,
            "model_type": r.model_type,
            "provider_name": r.provider_name,
            "total_calls": r.total_calls,
            "success_calls": r.success_calls or 0,
            "failed_calls": r.failed_calls or 0,
            "avg_response_ms": round(r.avg_response_ms, 1) if r.avg_response_ms else None,
            "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
        }
        for r in rows
    ]


# ============ 健康检查 ============

@router.get("/models/{model_id}/health")
async def get_model_health(model_id: int, db: AsyncSession = Depends(get_db)):
    m = await db.get(Model, model_id)
    if not m:
        raise HTTPException(404, "模型不存在")

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    stats_stmt = select(
        func.count().label("total"),
        func.sum(case((ModelUsageLog.status == "success", 1), else_=0)).label("success"),
        func.avg(ModelUsageLog.response_time_ms).label("avg_ms"),
    ).where(and_(ModelUsageLog.model_id == model_id, ModelUsageLog.created_at >= last_24h))
    stats = (await db.execute(stats_stmt)).one()

    total = stats.total or 0
    success = stats.success or 0
    avg_ms = stats.avg_ms

    keys_stmt = (
        select(APIKey)
        .where(and_(APIKey.provider_id == m.provider_id, APIKey.status == "active"))
        .order_by(APIKey.priority.desc())
    )
    keys_result = await db.execute(keys_stmt)
    active_keys = keys_result.scalars().all()

    return {
        "model_id": m.id,
        "model_name": m.name,
        "is_active": m.is_active,
        "last_24h": {
            "total_calls": total,
            "success_rate": round(success / total * 100, 1) if total > 0 else None,
            "avg_response_ms": round(avg_ms, 1) if avg_ms else None,
        },
        "active_keys": len(active_keys),
        "keys_health": [
            {
                "key_id": k.id,
                "name": k.name,
                "status": k.status,
                "last_test_success": k.last_test_success,
                "last_test_at": k.last_test_at.isoformat() if k.last_test_at else None,
                "weight": k.weight,
                "max_concurrent": k.max_concurrent,
            }
            for k in active_keys
        ],
    }
