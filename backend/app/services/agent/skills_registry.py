# Nanoai Team8 Agent System — Skills Registry
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import (
    SystemSkill, UserSkill, SkillPromotionRequest,
    SkillStatus, UserSkillStatus, PromotionStatus,
)

logger = logging.getLogger(__name__)


class SkillsRegistry:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── System Skills ──

    async def create_system_skill(
        self,
        name: str,
        skill_md: str,
        config: dict | None = None,
        source_user_id: str | None = None,
    ) -> SystemSkill:
        """创建系统技能"""
        skill = SystemSkill(
            name=name,
            version="1.0.0",
            skill_md=skill_md,
            config_json=config or {},
            status=SkillStatus.DRAFT,
            source_user_id=uuid.UUID(source_user_id) if source_user_id else None,
        )
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def activate_skill(self, skill_id: str) -> SystemSkill:
        """激活技能"""
        skill = await self._get_system_skill(skill_id)
        skill.status = SkillStatus.ACTIVE
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def list_system_skills(
        self,
        status: str | None = None,
        limit: int = 50,
    ) -> list[SystemSkill]:
        """列出系统技能"""
        stmt = select(SystemSkill)
        if status:
            stmt = stmt.where(SystemSkill.status == status)
        stmt = stmt.order_by(SystemSkill.updated_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def record_usage(
        self,
        skill_id: str,
        success: bool,
        duration_ms: int,
    ) -> None:
        """记录技能使用情况"""
        skill = await self._get_system_skill(skill_id)
        skill.usage_count += 1
        total = skill.usage_count
        old_rate = skill.success_rate

        # 增量更新平均值
        if success:
            skill.success_rate = (old_rate * (total - 1) + 1.0) / total
        else:
            skill.success_rate = (old_rate * (total - 1)) / total

        skill.avg_duration_ms = int(
            (skill.avg_duration_ms * (total - 1) + duration_ms) / total
        )
        await self.db.commit()

    async def curate_review(self) -> list[dict]:
        """Curator 审查：返回需要审查的技能列表"""
        stmt = select(SystemSkill).where(
            and_(
                SystemSkill.status == SkillStatus.ACTIVE,
                SystemSkill.success_rate < 0.5,
            )
        )
        result = await self.db.execute(stmt)
        skills = result.scalars().all()

        review_items = []
        for s in skills:
            review_items.append({
                "id": str(s.id),
                "name": s.name,
                "success_rate": s.success_rate,
                "usage_count": s.usage_count,
                "action": "archive" if s.success_rate < 0.3 else "review",
            })
        return review_items

    # ── User Skills ──

    async def create_user_skill(
        self,
        user_id: str,
        name: str,
        skill_md: str,
        config: dict | None = None,
    ) -> UserSkill:
        """创建用户技能"""
        skill = UserSkill(
            user_id=uuid.UUID(user_id),
            name=name,
            version="1.0.0",
            skill_md=skill_md,
            config_json=config or {},
            status=UserSkillStatus.PERSONAL,
        )
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def fork_system_skill(
        self,
        user_id: str,
        system_skill_id: str,
        modifications: str | None = None,
    ) -> UserSkill:
        """从系统技能 fork 到用户分支"""
        system_skill = await self._get_system_skill(system_skill_id)

        user_skill = UserSkill(
            user_id=uuid.UUID(user_id),
            system_skill_id=system_skill.id,
            name=system_skill.name,
            version=system_skill.version,
            skill_md=modifications or system_skill.skill_md,
            config_json=system_skill.config_json,
            status=UserSkillStatus.PERSONAL,
            fork_version=system_skill.version,
            divergence=0.0 if not modifications else 0.3,
        )
        self.db.add(user_skill)
        await self.db.commit()
        await self.db.refresh(user_skill)
        return user_skill

    async def list_user_skills(
        self,
        user_id: str,
        status: str | None = None,
    ) -> list[UserSkill]:
        """列出用户技能"""
        stmt = select(UserSkill).where(UserSkill.user_id == uuid.UUID(user_id))
        if status:
            stmt = stmt.where(UserSkill.status == status)
        stmt = stmt.order_by(UserSkill.updated_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    # ── Promotion (Git push) ──

    async def request_promotion(
        self,
        user_id: str,
        user_skill_id: str,
        system_skill_id: str | None = None,
        diff_summary: str | None = None,
    ) -> SkillPromotionRequest:
        """提交技能提升请求（Git push）"""
        request = SkillPromotionRequest(
            user_id=uuid.UUID(user_id),
            user_skill_id=uuid.UUID(user_skill_id),
            system_skill_id=uuid.UUID(system_skill_id) if system_skill_id else None,
            status=PromotionStatus.PENDING,
            diff_summary=diff_summary,
        )
        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)
        return request

    async def review_promotion(
        self,
        request_id: str,
        approved: bool,
        test_results: dict | None = None,
    ) -> SkillPromotionRequest:
        """审核提升请求"""
        stmt = select(SkillPromotionRequest).where(
            SkillPromotionRequest.id == uuid.UUID(request_id)
        )
        result = await self.db.execute(stmt)
        req = result.scalar_one_or_none()
        if not req:
            raise ValueError(f"Promotion request {request_id} not found")

        if approved:
            req.status = PromotionStatus.APPROVED
            # 合并到系统技能
            if req.system_skill_id:
                system_skill = await self._get_system_skill(str(req.system_skill_id))
                user_skill = await self._get_user_skill(str(req.user_skill_id))
                system_skill.skill_md = user_skill.skill_md
                system_skill.config_json = user_skill.config_json
                system_skill.version = _increment_version(system_skill.version)
                user_skill.status = UserSkillStatus.MERGED
            else:
                # 新建系统技能
                user_skill = await self._get_user_skill(str(req.user_skill_id))
                await self.create_system_skill(
                    name=user_skill.name,
                    skill_md=user_skill.skill_md,
                    config=user_skill.config_json,
                    source_user_id=str(user_skill.user_id),
                )
                user_skill.status = UserSkillStatus.PROMOTED
        else:
            req.status = PromotionStatus.REJECTED

        req.test_results_json = test_results
        req.reviewed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(req)
        return req

    # ── Git-like operations ──

    async def diff(self, user_skill_id: str) -> dict:
        """对比用户技能与系统技能的差异（Git diff）"""
        user_skill = await self._get_user_skill(user_skill_id)
        if not user_skill.system_skill_id:
            return {"diff_type": "new", "user_skill": user_skill.skill_md}

        system_skill = await self._get_system_skill(str(user_skill.system_skill_id))
        user_lines = user_skill.skill_md.splitlines()
        system_lines = system_skill.skill_md.splitlines()

        # 简单行级 diff
        added, removed = _simple_diff(system_lines, user_lines)
        divergence = len(added) + len(removed)

        return {
            "diff_type": "modified",
            "user_version": user_skill.version,
            "system_version": system_skill.version,
            "added_lines": len(added),
            "removed_lines": len(removed),
            "divergence": divergence,
            "added": added[:10],
            "removed": removed[:10],
        }

    async def pull(self, user_id: str, user_skill_id: str) -> UserSkill:
        """同步系统技能更新到用户分支（Git pull）"""
        user_skill = await self._get_user_skill(user_skill_id)
        if not user_skill.system_skill_id:
            raise ValueError("Cannot pull: no system skill linked")

        system_skill = await self._get_system_skill(str(user_skill.system_skill_id))

        if user_skill.fork_version == system_skill.version:
            return user_skill  # 已是最新

        # 如果用户有修改，标记为 diverged
        if user_skill.divergence > 0:
            user_skill.status = UserSkillStatus.DIVERGED
        else:
            # 无修改，直接同步
            user_skill.skill_md = system_skill.skill_md
            user_skill.config_json = system_skill.config_json
            user_skill.version = system_skill.version
            user_skill.fork_version = system_skill.version

        await self.db.commit()
        await self.db.refresh(user_skill)
        return user_skill

    # ── Internal ──

    async def _get_system_skill(self, skill_id: str) -> SystemSkill:
        stmt = select(SystemSkill).where(SystemSkill.id == uuid.UUID(skill_id))
        result = await self.db.execute(stmt)
        skill = result.scalar_one_or_none()
        if not skill:
            raise ValueError(f"SystemSkill {skill_id} not found")
        return skill

    async def _get_user_skill(self, skill_id: str) -> UserSkill:
        stmt = select(UserSkill).where(UserSkill.id == uuid.UUID(skill_id))
        result = await self.db.execute(stmt)
        skill = result.scalar_one_or_none()
        if not skill:
            raise ValueError(f"UserSkill {skill_id} not found")
        return skill


def _increment_version(version: str) -> str:
    """语义化版本 patch +1"""
    parts = version.split(".")
    if len(parts) == 3:
        try:
            parts[2] = str(int(parts[2]) + 1)
            return ".".join(parts)
        except ValueError:
            return version
    return version


def _simple_diff(old_lines: list[str], new_lines: list[str]) -> tuple[list[str], list[str]]:
    """简单行级 diff，返回 (added, removed)"""
    old_set = set(old_lines)
    new_set = set(new_lines)
    added = [l for l in new_lines if l not in old_set]
    removed = [l for l in old_lines if l not in new_set]
    return added, removed
