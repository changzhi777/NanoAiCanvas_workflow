# Nanoai Team8 Agent System — Art Director Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class ArtDirectorAgent(BaseAgent):
    """美术总监 Agent：视觉审核 + 质量门禁"""

    name = "art_director"
    description = "美术总监Agent — 视觉风格审核、色彩一致性、画面质量门禁"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "review")

        if stage == "review":
            return await self._stage_review(task, context)
        elif stage == "style_guide":
            return await self._stage_style_guide(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_review(self, task: dict, context: dict) -> dict:
        """视觉审核：检查画面描述的质量和一致性"""
        storyboard = context.get("storyboard", context.get("plan", {}))

        prompt = self.load_prompt("review")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "visual_review",
                "storyboard": storyboard,
                "checklist": [
                    "色彩一致性",
                    "构图合理性",
                    "风格统一性",
                    "角色辨识度",
                    "场景连贯性",
                ],
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {"stage": "review", "result": content}

    async def _stage_style_guide(self, task: dict, context: dict) -> dict:
        """生成视觉风格指南"""
        script = context.get("script", {})

        prompt = self.load_prompt("style_guide")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "generate_style_guide",
                "script": script,
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {"stage": "style_guide", "result": content}

