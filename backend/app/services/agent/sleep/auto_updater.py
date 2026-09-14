# Nanoai Team8 Agent System — Auto Updater
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

"""
自动更新引擎：根据睡眠模式分析结果，自动优化 Agent prompt 和配置。

仅修改以下内容（安全范围）:
1. prompts/{agent}.md — Agent 提示词
2. nanoai-agent.yaml 中的 agent 配置（temperature, max_tokens）

不做:
- 不修改代码文件
- 不修改数据库结构
- 不修改 API 路由
"""

import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from app.services.agent.sleep.efficiency_optimizer import OptimizationReport

logger = logging.getLogger(__name__)

AGENT_DIR = Path(__file__).parent.parent
PROMPTS_DIR = AGENT_DIR / "agents" / "prompts"
CONFIG_FILE = AGENT_DIR.parent.parent.parent.parent / "nanoai-agent.yaml"
BACKUP_DIR = AGENT_DIR / "memory" / "auto_update_backups"


class AutoUpdater:
    """根据优化建议自动更新 Agent 配置"""

    async def apply_suggestions(self, report: OptimizationReport) -> list[dict]:
        """应用优化建议，返回变更列表"""
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        changes = []

        for suggestion in report.suggestions:
            if suggestion["priority"] != "high":
                continue

            action = suggestion["action"]
            target = suggestion["target"]  # e.g., "screenwriter.outline"

            try:
                if action == "optimize_prompt":
                    change = await self._optimize_prompt(target, suggestion)
                    if change:
                        changes.append(change)

                elif action == "adjust_max_tokens":
                    change = await self._adjust_config(target, suggestion)
                    if change:
                        changes.append(change)

            except Exception as e:
                logger.error(f"Auto-update failed for {target}: {e}")
                changes.append({"target": target, "action": action, "status": "failed", "error": str(e)})

        return changes

    async def _optimize_prompt(self, target: str, suggestion: dict) -> dict | None:
        """优化 Agent prompt 文件"""
        agent_name = target.split(".")[0]
        prompt_file = PROMPTS_DIR / f"{agent_name}.md"

        if not prompt_file.exists():
            return None

        # 备份
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"{agent_name}_{timestamp}.md"
        shutil.copy2(prompt_file, backup_file)

        # 追加优化注释（不覆盖现有内容）
        current = prompt_file.read_text()
        suggestion_text = suggestion['suggestion']
        if suggestion_text in current:
            return None

        optimization_note = f"\n\n<!-- Auto-optimized: {datetime.now(timezone.utc).isoformat()} -->\n<!-- {suggestion_text} -->\n"

        if optimization_note not in current:
            prompt_file.write_text(current + optimization_note)
            return {
                "target": target,
                "action": "optimize_prompt",
                "status": "applied",
                "backup": str(backup_file),
                "note": suggestion["suggestion"],
            }

        return None

    async def _adjust_config(self, target: str, suggestion: dict) -> dict | None:
        """调整 YAML 配置（标记建议，需要手动确认修改）"""
        # 安全部：仅记录建议，不自动修改 YAML
        return {
            "target": target,
            "action": "adjust_max_tokens",
            "status": "suggested",
            "note": suggestion["suggestion"],
        }

    async def rollback(self, backup_path: str) -> bool:
        """回滚到备份版本"""
        backup = Path(backup_path)
        if not backup.exists():
            return False

        # 从备份文件名解析 agent 名称
        agent_name = backup.stem.rsplit("_", 2)[0]
        prompt_file = PROMPTS_DIR / f"{agent_name}.md"

        shutil.copy2(backup, prompt_file)
        logger.info(f"Rolled back {agent_name} prompt from {backup_path}")
        return True
