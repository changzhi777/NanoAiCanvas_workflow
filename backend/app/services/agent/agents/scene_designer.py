# Nanoai Team8 Agent System — Scene Designer Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class SceneDesignerAgent(BaseAgent):
    """场景设计 Agent：场景背景图提示词 + 环境氛围"""

    name = "scene_designer"
    description = "场景设计Agent — 场景背景图生成、环境氛围描述、光影设计、场景连续性"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "design")

        if stage == "design":
            return await self._stage_design(task, context)
        elif stage == "atmosphere":
            return await self._stage_atmosphere(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_design(self, task: dict, context: dict) -> dict:
        """场景设计：生成场景描述和背景图提示词"""
        scenes = task.get("scenes", [])
        script = context.get("script", {})

        prompt = self.load_prompt("design")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "design_scenes",
                "scenes": scenes,
                "script_context": script,
                "output_format": {
                    "scene_name": "场景名称",
                    "location": "具体地点",
                    "time_of_day": "时间（清晨/上午/中午/下午/黄昏/夜晚）",
                    "weather": "天气",
                    "lighting": "光影描述",
                    "mood": "氛围关键词",
                    "key_elements": "关键视觉元素（3-5个）",
                    "image_prompt": "AI 生图提示词（英文，详细描述）",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {"stage": "design", "result": content}

    async def _stage_atmosphere(self, task: dict, context: dict) -> dict:
        """氛围设计：为每个场景补充环境氛围细节"""
        scene_designs = context.get("scene_design", {})
        storyboard = context.get("storyboard", {})

        prompt = self.load_prompt("atmosphere")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "design_atmosphere",
                "scene_designs": scene_designs,
                "storyboard": storyboard,
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {"stage": "atmosphere", "result": content}

