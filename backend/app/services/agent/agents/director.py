# Nanoai Team8 Agent System — Director Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class DirectorAgent(BaseAgent):
    """导演 Agent：分镜规划 + 镜头语言"""

    name = "director"
    description = "导演Agent — 分镜规划、镜头语言设计、场景调度、视觉节奏"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "plan")

        if stage == "plan":
            return await self._stage_plan(task, context)
        elif stage == "storyboard":
            return await self._stage_storyboard(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_plan(self, task: dict, context: dict) -> dict:
        """分镜规划阶段"""
        script = context.get("script", {})
        outline = context.get("outline", {})

        prompt = self.load_prompt("plan")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "plan_shots",
                "script": script,
                "outline": outline,
                "requirements": {
                    "shots_per_scene": "3-5",
                    "camera_movements": ["pan", "tilt", "zoom", "tracking"],
                    "transitions": ["cut", "dissolve", "fade"],
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "plan",
            "result": content,
        }

    async def _stage_storyboard(self, task: dict, context: dict) -> dict:
        """分镜生成阶段"""
        shot_plan = context.get("shot_plan", {})

        prompt = self.load_prompt("storyboard")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "generate_storyboard",
                "shot_plan": shot_plan,
                "format": {
                    "fields": ["shot_number", "scene", "description", "camera", "duration", "dialogue", "notes"],
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "storyboard",
            "result": content,
        }

