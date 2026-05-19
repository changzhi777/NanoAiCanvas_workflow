# Nanoai Team8 Agent System — Voice Director Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class VoiceDirectorAgent(BaseAgent):
    """配音导演 Agent：TTS 配音 + 情绪标注"""

    name = "voice_director"
    description = "配音导演Agent — 语音合成、角色配音、情绪标注、旁白设计"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "cast")

        if stage == "cast":
            return await self._stage_cast(task, context)
        elif stage == "direct":
            return await self._stage_direct(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_cast(self, task: dict, context: dict) -> dict:
        """配音选角：为每个角色分配合适的音色"""
        script = context.get("script", {})
        characters = task.get("characters", [])

        prompt = self.load_prompt("cast")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "voice_cast",
                "characters": characters,
                "script": script,
                "output_format": {
                    "character": "角色名",
                    "voice_type": "音色类型（男/女/童/老年）",
                    "timbre": "音色描述（温柔/沙哑/清亮/低沉）",
                    "emotion_map": "对白→情绪映射",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        return {"stage": "cast", "result": self._extract_content(response)}

    async def _stage_direct(self, task: dict, context: dict) -> dict:
        """配音指导：标注每句对白的情绪和语调"""
        script = context.get("script", {})
        voice_cast = context.get("voice_cast", {})

        prompt = self.load_prompt("direct")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "direct_voices",
                "script": script,
                "voice_cast": voice_cast,
                "output_format": {
                    "line": "对白原文",
                    "character": "角色",
                    "emotion": "情绪标签",
                    "intensity": "强度 1-5",
                    "pace": "语速（快/中/慢）",
                    "tts_params": "TTS 参数建议",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        return {"stage": "direct", "result": self._extract_content(response)}

