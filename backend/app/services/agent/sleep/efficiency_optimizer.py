# Nanoai Team8 Agent System — Efficiency Optimizer
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentExecutionLog

logger = logging.getLogger(__name__)


@dataclass
class OptimizationReport:
    bottlenecks: list[dict] = field(default_factory=list)
    failure_patterns: list[dict] = field(default_factory=list)
    success_patterns: list[dict] = field(default_factory=list)
    token_anomalies: list[dict] = field(default_factory=list)
    model_comparison: list[dict] = field(default_factory=list)
    suggestions: list[dict] = field(default_factory=list)


@dataclass
class SleepReport:
    total_tasks: int = 0
    success_rate: float = 0.0
    avg_duration_ms: int = 0
    bottleneck_ranking: list[dict] = field(default_factory=list)
    optimization_suggestions: list[dict] = field(default_factory=list)
    version_delta: dict = field(default_factory=dict)


class EfficiencyOptimizer:
    """基于执行日志的效率自优化引擎"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_execution_logs(self, since_days: int = 7) -> OptimizationReport:
        """分析历史执行数据，识别优化机会"""
        since = datetime.now(timezone.utc) - timedelta(days=since_days)
        report = OptimizationReport()

        # 1. 瓶颈识别：avg_duration_ms 最长的 (agent, stage)
        report.bottlenecks = await self._identify_bottlenecks(since)

        # 2. 失败模式：error_message 聚类
        report.failure_patterns = await self._analyze_failures(since)

        # 3. 成功模式：duration 低于平均的成功 config
        report.success_patterns = await self._analyze_successes(since)

        # 4. Token 效率：output_tokens / input_tokens 异常
        report.token_anomalies = await self._analyze_token_efficiency(since)

        # 5. 模型对比：同一 agent 不同 model 的 duration
        report.model_comparison = await self._compare_models(since)

        # 6. 综合建议
        report.suggestions = self._generate_suggestions(report)

        return report

    async def generate_sleep_report(self, since_days: int = 7) -> SleepReport:
        """生成睡眠报告"""
        since = datetime.now(timezone.utc) - timedelta(days=since_days)

        # 总体统计
        stmt = select(
            func.count(AgentExecutionLog.id),
            func.avg(
                func.cast(AgentExecutionLog.success, func.Integer())
            ),
            func.avg(AgentExecutionLog.duration_ms),
        ).where(AgentExecutionLog.created_at >= since)

        result = await self.db.execute(stmt)
        row = result.one()
        total = row[0] or 0

        report = SleepReport(
            total_tasks=total,
            success_rate=float(row[1] or 0),
            avg_duration_ms=int(row[2] or 0),
        )

        # 瓶颈排名
        optimization = await self.analyze_execution_logs(since_days)
        report.bottleneck_ranking = optimization.bottlenecks[:5]
        report.optimization_suggestions = optimization.suggestions

        return report

    async def _identify_bottlenecks(self, since: datetime) -> list[dict]:
        """瓶颈识别：耗时最长的 agent+stage 组合"""
        stmt = select(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
            func.avg(AgentExecutionLog.duration_ms).label("avg_ms"),
            func.count(AgentExecutionLog.id).label("count"),
        ).where(
            and_(
                AgentExecutionLog.created_at >= since,
                AgentExecutionLog.success == True,
            )
        ).group_by(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
        ).order_by(desc("avg_ms")).limit(10)

        result = await self.db.execute(stmt)
        return [
            {
                "agent": r.agent_name,
                "stage": r.stage,
                "avg_duration_ms": int(r.avg_ms),
                "count": r.count,
            }
            for r in result.all()
        ]

    async def _analyze_failures(self, since: datetime) -> list[dict]:
        """失败模式分析"""
        stmt = select(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
            AgentExecutionLog.error_message,
            func.count(AgentExecutionLog.id).label("count"),
        ).where(
            and_(
                AgentExecutionLog.created_at >= since,
                AgentExecutionLog.success == False,
            )
        ).group_by(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
            AgentExecutionLog.error_message,
        ).order_by(desc("count")).limit(10)

        result = await self.db.execute(stmt)
        return [
            {
                "agent": r.agent_name,
                "stage": r.stage,
                "error": r.error_message,
                "count": r.count,
            }
            for r in result.all()
        ]

    async def _analyze_successes(self, since: datetime) -> list[dict]:
        """成功模式分析：找出低于平均耗时的成功案例"""
        # 先算平均
        avg_stmt = select(func.avg(AgentExecutionLog.duration_ms)).where(
            and_(
                AgentExecutionLog.created_at >= since,
                AgentExecutionLog.success == True,
            )
        )
        avg_result = await self.db.execute(avg_stmt)
        avg_duration = avg_result.scalar() or 0

        # 找出低于平均的
        stmt = select(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
            AgentExecutionLog.model_used,
            func.avg(AgentExecutionLog.duration_ms).label("avg_ms"),
            func.avg(AgentExecutionLog.output_tokens).label("avg_tokens"),
            func.count(AgentExecutionLog.id).label("count"),
        ).where(
            and_(
                AgentExecutionLog.created_at >= since,
                AgentExecutionLog.success == True,
                AgentExecutionLog.duration_ms < avg_duration,
            )
        ).group_by(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
            AgentExecutionLog.model_used,
        ).order_by("avg_ms").limit(10)

        result = await self.db.execute(stmt)
        return [
            {
                "agent": r.agent_name,
                "stage": r.stage,
                "model": r.model_used,
                "avg_duration_ms": int(r.avg_ms),
                "avg_tokens": int(r.avg_tokens or 0),
                "count": r.count,
            }
            for r in result.all()
        ]

    async def _analyze_token_efficiency(self, since: datetime) -> list[dict]:
        """Token 效率分析"""
        stmt = select(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
            func.avg(AgentExecutionLog.input_tokens).label("avg_in"),
            func.avg(AgentExecutionLog.output_tokens).label("avg_out"),
        ).where(
            and_(
                AgentExecutionLog.created_at >= since,
                AgentExecutionLog.input_tokens > 0,
            )
        ).group_by(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.stage,
        ).limit(10)

        result = await self.db.execute(stmt)
        anomalies = []
        for r in result.all():
            ratio = (r.avg_out or 0) / max(r.avg_in or 1, 1)
            if ratio > 2.0 or ratio < 0.1:
                anomalies.append({
                    "agent": r.agent_name,
                    "stage": r.stage,
                    "avg_input": int(r.avg_in),
                    "avg_output": int(r.avg_out),
                    "ratio": round(ratio, 2),
                    "issue": "output_too_high" if ratio > 2.0 else "output_too_low",
                })
        return anomalies

    async def _compare_models(self, since: datetime) -> list[dict]:
        """模型对比分析"""
        stmt = select(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.model_used,
            func.avg(AgentExecutionLog.duration_ms).label("avg_ms"),
            func.avg(
                func.cast(AgentExecutionLog.success, func.Integer())
            ).label("success_rate"),
            func.count(AgentExecutionLog.id).label("count"),
        ).where(AgentExecutionLog.created_at >= since).group_by(
            AgentExecutionLog.agent_name,
            AgentExecutionLog.model_used,
        ).limit(20)

        result = await self.db.execute(stmt)
        return [
            {
                "agent": r.agent_name,
                "model": r.model_used,
                "avg_duration_ms": int(r.avg_ms or 0),
                "success_rate": round(float(r.success_rate or 0), 2),
                "count": r.count,
            }
            for r in result.all()
        ]

    def _generate_suggestions(self, report: OptimizationReport) -> list[dict]:
        """根据分析结果生成优化建议"""
        suggestions = []

        # 瓶颈建议
        for b in report.bottlenecks[:3]:
            suggestions.append({
                "type": "bottleneck",
                "target": f"{b['agent']}.{b['stage']}",
                "suggestion": f"优化 {b['agent']} 的 {b['stage']} 阶段（平均耗时 {b['avg_duration_ms']}ms）",
                "action": "optimize_prompt",
                "priority": "high",
            })

        # 失败建议
        for f in report.failure_patterns[:3]:
            suggestions.append({
                "type": "failure",
                "target": f"{f['agent']}.{f['stage']}",
                "suggestion": f"修复 {f['agent']} 的 {f['stage']} 阶段错误（{f['count']}次）",
                "action": "add_error_handling",
                "priority": "high",
                "error": f["error"],
            })

        # Token 建议
        for t in report.token_anomalies[:3]:
            suggestions.append({
                "type": "token_efficiency",
                "target": f"{t['agent']}.{t['stage']}",
                "suggestion": f"调整 {t['agent']} 的 token 预算（当前 ratio={t['ratio']}）",
                "action": "adjust_max_tokens",
                "priority": "medium",
            })

        return suggestions
