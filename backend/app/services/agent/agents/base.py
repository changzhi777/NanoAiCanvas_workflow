# Nanoai Team8 Agent System — Base Agent
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

from __future__ import annotations

import logging
import time
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import AsyncIterator, TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentExecutionLog

if TYPE_CHECKING:
    from app.services.agent.model_router import ModelRouter

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    name: str = "base"
    description: str = ""

    def __init__(self, model_router: ModelRouter, db: AsyncSession):
        self.model_router = model_router
        self.db = db

    @abstractmethod
    async def run(self, task: dict, context: dict) -> dict:
        """执行 Agent 核心逻辑"""
        ...

    async def chat(self, messages: list[dict], stream: bool = True) -> AsyncIterator[bytes] | dict:
        """调用 LLM 进行对话"""
        return await self.model_router.chat_completion(
            messages=messages,
            agent_name=self.name,
            stream=stream,
        )

    def load_prompt(self, stage: str = "default") -> str:
        """从 prompts/{agent_name}.md 加载提示词"""
        prompt_file = Path(__file__).parent / "prompts" / f"{self.name}.md"
        if prompt_file.exists():
            content = prompt_file.read_text()
            # 支持 --- 分隔的多阶段 prompt
            sections = content.split("---")
            if len(sections) > 1:
                for section in sections:
                    if section.strip().startswith(f"# {stage}"):
                        return section.strip()
            return content
        return f"You are the {self.name} agent."

    async def _measure_execution(
        self,
        user_id: str,
        task_id: str | None,
        stage: str,
        fn,
        **kwargs,
    ) -> dict:
        """测量执行耗时 + token 消耗，自动写入 AgentExecutionLog"""
        start = time.time()
        success = True
        error_msg = None
        result = {}
        input_tokens = 0
        output_tokens = 0

        try:
            result = await fn(**kwargs)
            if isinstance(result, dict):
                usage = result.get("_usage", {})
                input_tokens = usage.get("input_tokens", 0)
                output_tokens = usage.get("output_tokens", 0)
        except Exception as e:
            success = False
            error_msg = str(e)
            logger.error(f"Agent {self.name} stage {stage} failed: {e}")
            raise
        finally:
            duration_ms = int((time.time() - start) * 1000)
            log = AgentExecutionLog(
                user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                task_id=uuid.UUID(task_id) if isinstance(task_id, str) and task_id else None,
                agent_name=self.name,
                stage=stage,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                duration_ms=duration_ms,
                success=success,
                error_message=error_msg,
                model_used=self.model_router.AGENT_MODEL_MAP.get(self.name, ("glm-4-flash",))[0],
            )
            self.db.add(log)
            await self.db.commit()

        return result

    def _extract_content(self, response: dict) -> str:
        """从 LLM 响应提取文本内容"""
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            return str(response)
