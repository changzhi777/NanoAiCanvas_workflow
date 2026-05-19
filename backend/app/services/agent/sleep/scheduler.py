# Nanoai Team8 Agent System — Sleep Scheduler
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.database import async_session_maker
from app.services.agent.skills_registry import SkillsRegistry
from app.services.agent.sleep.efficiency_optimizer import EfficiencyOptimizer
from app.redis import redis_client

logger = logging.getLogger(__name__)

SLEEP_REPORTS_DIR = Path(__file__).parent.parent / "memory" / "sleep_reports"
SLEEP_CHANNEL = "agent:sleep:events"

# 睡眠阶段
PHASES = [
    "review_memories",
    "prune",
    "skill_review",
    "efficiency_optimization",
    "validation",
    "report",
]


class SleepScheduler:
    """睡眠模式调度器：定时触发 Agent 系统自优化"""

    def __init__(self):
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self, schedule_hour: int = 3):
        """启动睡眠调度"""
        self._running = True
        self._task = asyncio.create_task(self._schedule_loop(schedule_hour))
        logger.info(f"Sleep scheduler started, will run at {schedule_hour}:00 daily")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def _schedule_loop(self, hour: int):
        """每天指定时间执行睡眠"""
        from datetime import timedelta

        while self._running:
            now = datetime.now(timezone.utc)
            target = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            if now >= target:
                target += timedelta(days=1)

            wait_seconds = (target - now).total_seconds()
            if wait_seconds > 0:
                logger.info(f"Sleep scheduled in {wait_seconds/3600:.1f} hours")
                try:
                    await asyncio.sleep(min(wait_seconds, 3600))  # 每小时检查
                    continue
                except asyncio.CancelledError:
                    break

            # 执行睡眠
            await self.execute_sleep()

    async def execute_sleep(self):
        """执行完整的睡眠流程"""
        logger.info("💤 Agent sleep mode starting...")
        SLEEP_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

        results = {}
        for phase in PHASES:
            try:
                logger.info(f"Sleep phase: {phase}")
                phase_result = await self._run_phase(phase)
                results[phase] = phase_result
            except Exception as e:
                logger.error(f"Sleep phase {phase} failed: {e}")
                results[phase] = {"error": str(e)}

        # 保存报告
        report_path = SLEEP_REPORTS_DIR / f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json"
        report_path.write_text(json.dumps(results, ensure_ascii=False, indent=2, default=str))

        # 推送事件
        await redis_client.publish(SLEEP_CHANNEL, json.dumps({
            "type": "sleep_completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "phases": list(results.keys()),
        }, ensure_ascii=False))

        logger.info("💤 Agent sleep mode completed")

    async def _run_phase(self, phase: str) -> dict:
        async with async_session_maker() as db:
            if phase == "review_memories":
                return await self._phase_review_memories(db)
            elif phase == "prune":
                return await self._phase_prune(db)
            elif phase == "skill_review":
                return await self._phase_skill_review(db)
            elif phase == "efficiency_optimization":
                return await self._phase_efficiency(db)
            elif phase == "validation":
                return {"status": "skipped", "reason": "validation requires sandbox"}
            elif phase == "report":
                return await self._phase_report(db)
            else:
                return {"status": "unknown_phase"}

    async def _phase_review_memories(self, db) -> dict:
        """Phase 1: 回顾 L1-L3 记忆"""
        # 遍历所有用户的 L1-L3 记忆，检查稳定性
        from sqlalchemy import select, func
        from app.models.agent import AgentMemory

        stmt = select(func.count(AgentMemory.id)).where(AgentMemory.layer >= 1)
        count = await db.scalar(stmt)
        return {"status": "completed", "memories_reviewed": count}

    async def _phase_prune(self, db) -> dict:
        """Phase 2: 修剪低稳定性记忆"""
        from sqlalchemy import select, delete
        from app.models.agent import AgentMemory

        # 全局修剪 stability < 0.3 的 L2/L3 记忆
        stmt = delete(AgentMemory).where(
            AgentMemory.layer >= 2,
            AgentMemory.stability < 0.3,
        )
        result = await db.execute(stmt)
        await db.commit()
        return {"status": "completed", "pruned": result.rowcount}

    async def _phase_skill_review(self, db) -> dict:
        """Phase 3: 技能审查"""
        registry = SkillsRegistry(db)
        review_items = await registry.curate_review()
        return {"status": "completed", "skills_to_review": len(review_items), "items": review_items}

    async def _phase_efficiency(self, db) -> dict:
        """Phase 4: 效率优化 + 自动更新"""
        optimizer = EfficiencyOptimizer(db)
        report = await optimizer.generate_sleep_report(since_days=7)

        # 获取完整优化报告
        opt_report = await optimizer.analyze_execution_logs(since_days=7)

        # 自动应用高优先级优化
        from app.services.agent.sleep.auto_updater import AutoUpdater
        updater = AutoUpdater()
        changes = await updater.apply_suggestions(opt_report)

        return {
            "status": "completed",
            "total_tasks": report.total_tasks,
            "success_rate": round(report.success_rate, 3),
            "avg_duration_ms": report.avg_duration_ms,
            "bottlenecks": report.bottleneck_ranking[:3],
            "suggestions": report.optimization_suggestions[:5],
            "auto_updates": changes,
        }

    async def _phase_report(self, db) -> dict:
        """Phase 6: 生成报告"""
        optimizer = EfficiencyOptimizer(db)
        report = await optimizer.generate_sleep_report(since_days=7)
        return {
            "status": "completed",
            "summary": {
                "total_tasks": report.total_tasks,
                "success_rate": round(report.success_rate, 3),
                "avg_duration_ms": report.avg_duration_ms,
                "top_bottleneck": report.bottleneck_ranking[0] if report.bottleneck_ranking else None,
            },
        }


# 全局单例
sleep_scheduler = SleepScheduler()
