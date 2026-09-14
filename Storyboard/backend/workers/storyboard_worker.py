"""
Nano2 API - AI Image Generation Service

Copyright ©2026 IoTchange (外星动物/常智)
All Rights Reserved.

Author: 外星动物（常智）IoTchange
Email: 14455975@qq.com
Version: 2.2.2

本软件著作权归作者 IoTchange 完整所有。
商用需授权，开源使用需标明作者。
"""

import asyncio
import signal
import logging
from datetime import datetime
from typing import Optional, Set

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.services.task_queue import TaskQueueManager, task_queue_manager
from app.services.storyboard_pipeline import StoryboardPipelineService, create_storyboard_pipeline
from app.schemas.pipeline import PipelineInput, ProgressInfo, PipelineStep
from app.schemas.storyboard import StoryboardStyle

# 配置日志
logger = logging.getLogger(__name__)


class StoryboardWorker:
    """故事板任务 Worker

    从 Redis 队列消费任务并执行流水线
    """

    def __init__(
        self,
        concurrency: int = 2,
        poll_interval: float = 1.0,
        max_retries: int = 3,
    ):
        """
        初始化 Worker

        Args:
            concurrency: 并发任务数
            poll_interval: 轮询间隔（秒）
            max_retries: 最大重试次数
        """
        self.concurrency = concurrency
        self.poll_interval = poll_interval
        self.max_retries = max_retries
        self.running = False
        self.active_tasks: Set[str] = set()
        self.queue_manager = TaskQueueManager()

    async def start(self) -> None:
        """启动 Worker"""
        if self.running:
            logger.warning("Worker 已经在运行")
            return

        self.running = True
        logger.info(f"启动故事板 Worker，并发数: {self.concurrency}")

        # 注册信号处理
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(self.stop()))

        # 启动轮询
        await self._poll_loop()

    async def stop(self) -> None:
        """停止 Worker"""
        if not self.running:
            return

        logger.info("正在停止 Worker...")
        self.running = False

        # 等待活动任务完成
        while self.active_tasks:
            logger.info(f"等待 {len(self.active_tasks)} 个任务完成...")
            await asyncio.sleep(1)

        logger.info("Worker 已停止")

    async def _poll_loop(self) -> None:
        """轮询队列"""
        while self.running:
            try:
                # 检查并发限制
                if len(self.active_tasks) >= self.concurrency:
                    await asyncio.sleep(self.poll_interval)
                    continue

                # 尝试获取任务
                task_id = await self.queue_manager.dequeue(timeout=1)

                if task_id:
                    logger.info(f"开始处理任务: {task_id}")
                    self.active_tasks.add(task_id)

                    # 异步执行任务
                    asyncio.create_task(self._execute_task(task_id))

            except Exception as e:
                logger.error(f"轮询错误: {e}")
                await asyncio.sleep(5)

    async def _execute_task(self, task_id: str) -> None:
        """执行单个任务

        Args:
            task_id: 任务ID
        """
        try:
            # 获取任务数据
            task_data = await self.queue_manager.get_task(task_id)
            if not task_data:
                logger.warning(f"任务不存在: {task_id}")
                return

            # 标记为处理中
            await self.queue_manager.mark_processing(task_id)

            # 创建流水线服务
            async with async_session_maker() as session:
                pipeline = create_storyboard_pipeline(session)

                # 构建输入数据
                input_data = PipelineInput(
                    input_text=task_data["inputText"],
                    style=StoryboardStyle(task_data.get("style", "cinematic")),
                    skip_characters=False,
                )

                # 执行流水线
                result = await pipeline.run_pipeline(
                    input_data=input_data,
                    user_id=int(task_data.get("userId", 0)),  # 从任务数据获取用户ID
                    on_progress=lambda info: self._on_progress(task_id, info),
                )

                # 标记完成
                await self.queue_manager.complete_task(task_id, {
                    "characters": result.characters,
                    "script": result.script,
                    "storyboard": result.storyboard,
                    "images": result.images,
                })

                logger.info(f"任务 {task_id} 完成")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"任务 {task_id} 失败: {error_msg}")

            # 标记失败
            await self.queue_manager.fail_task(task_id, error_msg)

        finally:
            self.active_tasks.discard(task_id)

    async def _on_progress(self, task_id: str, info: ProgressInfo) -> None:
        """进度回调

        Args:
            task_id: 任务ID
            info: 进度信息
        """
        logger.info(f"[{task_id}] [{info.step}] {info.progress}% - {info.message}")

        # 更新 Redis 进度
        await self.queue_manager.update_progress(
            task_id=task_id,
            step=info.step.value if hasattr(info.step, 'value') else str(info.step),
            progress=info.progress,
            message=info.message,
        )

    def get_status(self) -> dict:
        """获取 Worker 状态

        Returns:
            状态字典
        """
        return {
            "running": self.running,
            "concurrency": self.concurrency,
            "active_count": len(self.active_tasks),
            "active_tasks": list(self.active_tasks),
        }


async def run_worker(concurrency: int = 2) -> None:
    """运行 Worker 的便捷函数

    Args:
        concurrency: 并发任务数
    """
    worker = StoryboardWorker(concurrency=concurrency)
    await worker.start()


# 命令行入口
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="故事板任务 Worker")
    parser.add_argument(
        "-c", "--concurrency",
        type=int,
        default=2,
        help="并发任务数（默认: 2）"
    )
    args = parser.parse_args()

    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    # 运行 Worker
    asyncio.run(run_worker(concurrency=args.concurrency))
