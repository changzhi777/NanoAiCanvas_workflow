"""admin.py 一镜到底模板 CRUD + 埋点统计端点单测

Covers: list / delete_404 / log_stats（mock 友好）
Skips: upsert / seed（依赖 TvcOneShotTemplate 构造，函数内 import，mock patch 不生效）
       → 由集成测试覆盖（tests/ 集成层真 DB）
"""
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime

import pytest


def _cm(db):
    class _C:
        async def __aenter__(self): return db
        async def __aexit__(self, *a): return None
    return _C()


def _row_template(**kw):
    row = MagicMock()
    row.id = kw.get('id', uuid4())
    row.narrative.value = kw.get('narrative', 'display')
    row.composition.value = kw.get('composition', 'character_object')
    row.name = kw.get('name', '测试模板')
    row.prompt_template = kw.get('prompt_template', 'p')
    row.recommended_duration = kw.get('recommended_duration', 12)
    row.motion_chain = kw.get('motion_chain', 'human_motion')
    row.bpm_hint = kw.get('bpm_hint', 90)
    row.is_active = kw.get('is_active', True)
    now = datetime.utcnow()
    row.created_at = now
    row.updated_at = now
    return row


@pytest.mark.asyncio
async def test_list_returns_array():
    from app.api.v2.admin import list_one_shot_templates
    row = _row_template(name="测试")
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[row]))))
    with patch("app.database.async_session_maker", return_value=_cm(db)):
        result = await list_one_shot_templates(current_user=None)
    assert len(result) == 1
    assert result[0]["name"] == "测试"
    assert result[0]["narrative"] == "display"
    assert result[0]["composition"] == "character_object"
    assert result[0]["bpm_hint"] == 90


@pytest.mark.asyncio
async def test_list_with_filters():
    from app.api.v2.admin import list_one_shot_templates
    row = _row_template()
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[row]))))
    with patch("app.database.async_session_maker", return_value=_cm(db)):
        result = await list_one_shot_templates(
            narrative="display", composition="character_object", is_active=True, current_user=None,
        )
    assert len(result) == 1
    # 验证 call 包含 where 子句
    args, _ = db.execute.call_args
    stmt = args[0]
    where_str = str(stmt)
    assert "narrative" in where_str
    assert "composition" in where_str
    assert "is_active" in where_str


@pytest.mark.asyncio
async def test_delete_404():
    from app.api.v2.admin import delete_one_shot_template
    db = AsyncMock()
    # 让 await db.execute(stmt).scalar_one_or_none() 返回 None（不是 coroutine）
    m = MagicMock(); m.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=m)
    from fastapi import HTTPException
    from app.api.v2.admin import delete_one_shot_template
    db = AsyncMock()
    m = MagicMock(); m.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=m)
    with patch("app.database.async_session_maker", return_value=_cm(db)):
        with pytest.raises(HTTPException) as exc:
            await delete_one_shot_template(str(uuid4()), current_user=None)
        assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_log_stats():
    from app.api.v2.admin import one_shot_log_stats
    n, c, name, act, cnt = MagicMock(), MagicMock(), "模板1", MagicMock(), 7
    n.value = "display"; c.value = "character_object"; act.value = "generated"
    db = AsyncMock()
    db.execute.return_value = MagicMock(all=MagicMock(return_value=[(n, c, name, act, cnt)]))
    with patch("app.database.async_session_maker", return_value=_cm(db)):
        result = await one_shot_log_stats(days=7, current_user=None)
    assert result[0]["count"] == 7
    assert result[0]["narrative"] == "display"
    assert result[0]["action"] == "generated"


@pytest.mark.asyncio
async def test_recent_logs():
    from app.api.v2.admin import one_shot_recent_logs
    log1 = MagicMock()
    log1.id = uuid4()
    log1.task_id = "tvc_abc"
    log1.user_id = uuid4()
    log1.narrative.value = "display"
    log1.composition.value = "merged"
    log1.action.value = "generated"
    log1.created_at = datetime.utcnow()
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[log1])))))
    with patch("app.database.async_session_maker", return_value=_cm(db)):
        result = await one_shot_recent_logs(limit=10, current_user=None)
    assert len(result) == 1
    assert result[0]["task_id"] == "tvc_abc"
