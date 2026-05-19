# Nanoai Team8 Agent System — Editor Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class EditorAgent(BaseAgent):
    """剪辑师 Agent：视频合成 + 转场 + 时序编排"""

    name = "editor"
    description = "剪辑师Agent — 视频合成、转场设计、时序编排、音视频同步"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "timeline")

        if stage == "timeline":
            return await self._stage_timeline(task, context)
        elif stage == "compose":
            return await self._stage_compose(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_timeline(self, task: dict, context: dict) -> dict:
        """时序编排：设计镜头的时间线"""
        storyboard = context.get("storyboard", {})
        shots = task.get("shots", [])

        prompt = self.load_prompt("timeline")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "create_timeline",
                "shots": shots,
                "storyboard": storyboard,
                "output_format": {
                    "shot_id": "镜头ID",
                    "start_time": "起始时间（秒）",
                    "end_time": "结束时间（秒）",
                    "transition_in": "入转场类型",
                    "transition_out": "出转场类型",
                    "audio_track": "音频轨道分配",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        return {"stage": "timeline", "result": self._extract_content(response)}

    async def _stage_compose(self, task: dict, context: dict) -> dict:
        """合成指令：生成视频合成指令"""
        timeline = context.get("timeline", {})
        voice_direct = context.get("voice_direct", {})

        prompt = self.load_prompt("compose")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "compose_video",
                "timeline": timeline,
                "voice_direct": voice_direct,
                "output_format": {
                    "ffmpeg_command": "FFmpeg 合成命令",
                    "input_files": "输入文件列表",
                    "output_spec": "输出规格（分辨率/帧率/编码）",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        return {"stage": "compose", "result": self._extract_content(response)}

