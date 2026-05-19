# Nanoai Team8 Agent System — Composer Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class ComposerAgent(BaseAgent):
    """作曲家 Agent：BGM 配乐 + 音效设计"""

    name = "composer"
    description = "作曲家Agent — BGM配乐、音效设计、情绪音乐匹配、音频时长控制"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "score")

        if stage == "score":
            return await self._stage_score(task, context)
        elif stage == "sfx":
            return await self._stage_sfx(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_score(self, task: dict, context: dict) -> dict:
        """配乐设计：为每个场景匹配 BGM"""
        storyboard = context.get("storyboard", {})
        timeline = context.get("timeline", {})

        prompt = self.load_prompt("score")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "design_score",
                "storyboard": storyboard,
                "timeline": timeline,
                "output_format": {
                    "scene": "场景",
                    "mood": "音乐情绪",
                    "genre": "音乐风格",
                    "tempo": "节奏（BPM）",
                    "instruments": "主要乐器",
                    "duration": "时长（秒）",
                    "prompt": "AI 音乐生成提示词",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        return {"stage": "score", "result": self._extract_content(response)}

    async def _stage_sfx(self, task: dict, context: dict) -> dict:
        """音效设计：补充环境音和特效音"""
        storyboard = context.get("storyboard", {})
        score = context.get("score", {})

        prompt = self.load_prompt("sfx")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "design_sfx",
                "storyboard": storyboard,
                "score": score,
                "output_format": {
                    "shot": "镜头编号",
                    "sfx_type": "音效类型（环境/动作/过渡）",
                    "description": "音效描述",
                    "timing": "触发时间点（秒）",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        return {"stage": "sfx", "result": self._extract_content(response)}

