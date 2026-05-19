# Nanoai Team8 Agent System — Screenwriter Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class ScreenwriterAgent(BaseAgent):
    """编剧 Agent：大纲生成 + 剧本撰写"""

    name = "screenwriter"
    description = "编剧Agent — 大纲生成、剧本撰写、对白创作、角色塑造"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "outline")

        if stage == "outline":
            return await self._stage_outline(task, context)
        elif stage == "script":
            return await self._stage_script(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_outline(self, task: dict, context: dict) -> dict:
        """大纲生成阶段"""
        novel_text = task.get("novel_text", "")
        chapter_info = task.get("chapter_info", {})
        stats = context.get("statistics", {})

        prompt = self.load_prompt("outline")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "generate_outline",
                "novel_text": novel_text[:4000],
                "chapter_info": chapter_info,
                "statistics": stats,
                "standards": {
                    "word_count": "1050-1850",
                    "scenes": "2-4",
                    "events": "2-3",
                    "chapter_mapping": "1:1 strict",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "outline",
            "result": content,
        }

    async def _stage_script(self, task: dict, context: dict) -> dict:
        """剧本撰写阶段"""
        outline = context.get("outline", {})
        novel_text = task.get("novel_text", "")

        prompt = self.load_prompt("script")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "write_script",
                "outline": outline,
                "novel_text": novel_text[:4000],
                "standards": {
                    "dialogue_speed": "<=240 chars",
                    "dialogue_total": "<=600 chars",
                    "duration": "3-4 min",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "script",
            "result": content,
        }

