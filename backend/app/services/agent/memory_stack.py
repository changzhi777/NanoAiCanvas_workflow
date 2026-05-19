# Nanoai Team8 Agent System — Memory Stack
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentMemory, AgentExecutionLog, MemoryLayer
from app.services.agent import __version__ as agent_version

logger = logging.getLogger(__name__)

MEMORY_DIR = Path(__file__).parent / "memory"
L0_DIR = MEMORY_DIR / "L0_identity"
L1_DIR = MEMORY_DIR / "L1_essential"

PRUNE_STABILITY_THRESHOLD = 0.3
L2_DEFAULT_HALF_LIFE = 30.0  # days
L3_DEFAULT_HALF_LIFE = 90.0  # days


class MemoryStack:
    def __init__(self, db: AsyncSession, user_id: str | uuid.UUID):
        self.db = db
        self.user_id = str(user_id)

    # ── Wake / Sleep lifecycle ──

    async def wake_up(self) -> dict:
        """加载 L0 身份 + L1 精华到上下文"""
        context = {
            "identity": self._load_l0(),
            "essential": await self._load_l1(),
        }
        return context

    async def sleep_prep(self, session_data: dict) -> None:
        """睡眠前：归档 L2 数据，触发修剪"""
        await self._archive_session_to_l2(session_data)
        await self.prune()

    # ── L0: Identity (file-based, hot-reload) ──

    def _load_l0(self) -> dict:
        identity_file = L0_DIR / "identity.json"
        if identity_file.exists():
            return json.loads(identity_file.read_text())
        return {"role": "Nanoai Team8 Agent", "version": agent_version}

    # ── L1: Essential (file-based, curated) ──

    async def _load_l1(self) -> list[dict]:
        items = []
        if L1_DIR.exists():
            for f in L1_DIR.glob("*.json"):
                items.append(json.loads(f.read_text()))

        # 同时加载 DB 中 L1 层的高稳定性记忆
        stmt = select(AgentMemory).where(
            and_(
                AgentMemory.user_id == self.user_id,
                AgentMemory.layer == MemoryLayer.ESSENTIAL,
                AgentMemory.stability >= 0.5,
            )
        ).order_by(AgentMemory.stability.desc()).limit(20)
        result = await self.db.execute(stmt)
        db_items = result.scalars().all()

        for item in db_items:
            items.append({
                "category": item.category,
                "content": item.content,
                "stability": item.stability,
            })

        return items

    # ── L2: On-Demand (PostgreSQL, user-isolated) ──

    async def query(
        self,
        layer: int = MemoryLayer.ON_DEMAND,
        category: str | None = None,
        keyword: str | None = None,
        limit: int = 10,
    ) -> list[AgentMemory]:
        """按层/类别/关键词检索记忆"""
        stmt = select(AgentMemory).where(
            and_(
                AgentMemory.user_id == self.user_id,
                AgentMemory.layer == layer,
            )
        )

        if category:
            stmt = stmt.where(AgentMemory.category == category)
        if keyword:
            escaped = keyword.replace("%", "\\%").replace("_", "\\_")
            stmt = stmt.where(AgentMemory.content.ilike(f"%{escaped}%"))

        stmt = stmt.order_by(AgentMemory.stability.desc()).limit(limit)
        result = await self.db.execute(stmt)

        memories = result.scalars().all()
        # 更新访问计数和最后访问时间
        for m in memories:
            m.access_count += 1
            m.last_accessed = datetime.now(timezone.utc)

        await self.db.commit()
        return memories

    async def store(
        self,
        layer: int,
        category: str,
        content: str,
        stability: float = 1.0,
        half_life_days: float | None = None,
    ) -> AgentMemory:
        """存储一条记忆"""
        if half_life_days is None:
            half_life_days = L2_DEFAULT_HALF_LIFE if layer <= 2 else L3_DEFAULT_HALF_LIFE

        memory = AgentMemory(
            user_id=self.user_id,
            layer=layer,
            category=category,
            content=content,
            stability=stability,
            half_life_days=half_life_days,
        )
        self.db.add(memory)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    # ── L3: Deep Search (PostgreSQL, long-term) ──

    async def deep_search(self, keyword: str, limit: int = 5) -> list[AgentMemory]:
        """L3 深度归档搜索"""
        return await self.query(
            layer=MemoryLayer.DEEP_SEARCH,
            keyword=keyword,
            limit=limit,
        )

    # ── Pruning ──

    async def prune(self) -> int:
        """修剪低稳定性记忆，返回删除数量"""
        # 重新计算所有 L2/L3 记忆的 stability
        stmt = select(AgentMemory).where(
            and_(
                AgentMemory.user_id == self.user_id,
                AgentMemory.layer >= MemoryLayer.ON_DEMAND,
            )
        )
        result = await self.db.execute(stmt)
        memories = result.scalars().all()

        pruned = 0
        for m in memories:
            current = m.calc_stability()
            m.stability = current
            if current < PRUNE_STABILITY_THRESHOLD:
                await self.db.delete(m)
                pruned += 1

        await self.db.commit()
        logger.info(f"Memory prune: removed {pruned} items for user {self.user_id}")
        return pruned

    # ── Experience recording ──

    async def record_execution_experience(self, exec_log: AgentExecutionLog) -> None:
        """从执行日志提取经验写入记忆"""
        if exec_log.success and exec_log.duration_ms > 0:
            await self.store(
                layer=MemoryLayer.ON_DEMAND,
                category="success_pattern",
                content=f"agent={exec_log.agent_name} stage={exec_log.stage} "
                        f"model={exec_log.model_used} duration={exec_log.duration_ms}ms",
                stability=0.8,
            )
        elif not exec_log.success:
            await self.store(
                layer=MemoryLayer.ON_DEMAND,
                category="failure_pattern",
                content=f"agent={exec_log.agent_name} stage={exec_log.stage} "
                        f"error={exec_log.error_message}",
                stability=0.6,
            )

    # ── Internal helpers ──

    async def _archive_session_to_l2(self, session_data: dict) -> None:
        """将 session 关键数据归档到 L2"""
        key_insights = session_data.get("key_insights", [])
        for insight in key_insights:
            await self.store(
                layer=MemoryLayer.ON_DEMAND,
                category="session_insight",
                content=str(insight),
                stability=0.7,
            )
