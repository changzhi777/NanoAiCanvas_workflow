# Nanoai Team8 Agent System — Producer Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import json
import logging

from app.services.agent.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class ProducerAgent(BaseAgent):
    """全局编排 Agent：文稿准备 + 统计分析 + 质量控制 + 合并归档"""

    name = "producer"
    description = "制片Agent — 全局编排、状态机调度、统计分析、质量门禁"

    async def run(self, task: dict, context: dict) -> dict:
        stage = task.get("stage", "prepare")

        if stage == "prepare":
            return await self._stage_prepare(task, context)
        elif stage == "statistics":
            return await self._stage_statistics(task, context)
        elif stage == "quality_control":
            return await self._stage_qc(task, context)
        elif stage == "merge":
            return await self._stage_merge(task, context)
        elif stage == "archive":
            return await self._stage_archive(task, context)
        else:
            return {"error": f"Unknown stage: {stage}"}

    async def _stage_prepare(self, task: dict, context: dict) -> dict:
        """文稿准备阶段：解析输入、生成统计需求"""
        novel_text = task.get("novel_text", "")
        chapter_info = task.get("chapter_info", {})

        prompt = self.load_prompt("prepare")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "prepare",
                "novel_text": novel_text[:4000],
                "chapter_info": chapter_info,
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "prepare",
            "result": content,
            "statistics_required": True,
            "word_count": len(novel_text),
        }

    async def _stage_statistics(self, task: dict, context: dict) -> dict:
        """统计分析：字数、场景数、角色统计"""
        text = context.get("novel_text", "")

        stats = {
            "total_chars": len(text),
            "dialogue_count": text.count('"') // 2 + text.count('"') // 2,
            "paragraph_count": text.count('\n\n') + 1,
        }

        prompt = self.load_prompt("statistics")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "statistics",
                "text_preview": text[:2000],
                "basic_stats": stats,
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "statistics",
            "result": content,
            "basic_stats": stats,
        }

    async def _stage_qc(self, task: dict, context: dict) -> dict:
        """质量控制：检查剧本是否符合改编规范"""
        script = context.get("script", {})
        outline = context.get("outline", {})

        prompt = self.load_prompt("quality_control")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps({
                "action": "quality_control",
                "script": script,
                "outline": outline,
                "standards": {
                    "word_count_range": "1050-1850",
                    "scene_range": "2-4",
                    "event_range": "2-3",
                    "duration_range": "3-4min",
                },
            }, ensure_ascii=False)},
        ]

        response = await self.chat(messages, stream=False)
        content = self._extract_content(response)

        return {
            "stage": "quality_control",
            "result": content,
        }

    async def _stage_merge(self, task: dict, context: dict) -> dict:
        """合并各 Agent 输出"""
        return {
            "stage": "merge",
            "result": context,
        }

    async def _stage_archive(self, task: dict, context: dict) -> dict:
        """归档最终成果"""
        return {
            "stage": "archive",
            "result": {"status": "archived", "data": context},
        }

    def _extract_content(self, response: dict) -> str:
        """从 LLM 响应提取文本内容"""
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            return str(response)
