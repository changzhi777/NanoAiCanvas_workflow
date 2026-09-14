# Nanoai Team8 Agent System — Character Designer Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class CharacterDesignerAgent(BaseAgent):
    """角色设计 Agent：角色设定图提示词 + 外观一致性"""

    name = "character_designer"
    description = "角色设计Agent — 角色设定图生成、外观描述、服装道具、角色一致性维护"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "design")

        if stage == "design":
            return await self._stage_design(task, context)
        elif stage == "consistency_check":
            return await self._stage_consistency(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_design(self, task: dict, context: dict) -> dict:
        """角色设计：生成角色外观描述和设定图提示词"""
        characters = task.get("characters", [])
        script = context.get("script", {})

        prompt = self.load_prompt("design")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "design_characters",
                "characters": characters,
                "script_context": script,
                "output_format": {
                    "name": "角色名",
                    "appearance": "外貌描述（面部、体型、年龄感）",
                    "clothing": "服装描述",
                    "props": "道具和配饰",
                    "personality": "性格关键词（3-5个）",
                    "image_prompt": "AI 生图提示词（英文，详细描述）",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {"stage": "design", "result": content}

    async def _stage_consistency(self, task: dict, context: dict) -> dict:
        """一致性检查：确保角色在所有镜头中外观一致"""
        character_designs = context.get("character_design", {})
        storyboard = context.get("storyboard", {})

        prompt = self.load_prompt("consistency")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "check_consistency",
                "character_designs": character_designs,
                "storyboard": storyboard,
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {"stage": "consistency_check", "result": content}

