"""
Skills Worker - 后台任务执行器

从 Redis 队列消费任务，步骤化执行图片生成：
1. validating    - 参数校验
2. prompt_build  - 提示词构建
3. api_submit    - 提交速创API
4. generating    - 轮询结果
5. completed/failed - 发布最终结果

每步通过 Redis Pub/Sub 发布进度，前端 WebSocket 实时接收。
"""

import asyncio
import os
import time
import traceback
import uuid
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings
from app.services.pubsub import TaskPublisher
from app.services.task_queue import TaskQueue, TaskQueueManager

settings = get_settings()

# 速创 API 配置
WUYIN_BASE = "https://api.wuyinkeji.com"
WUYIN_KEY = os.getenv("WUYINKEJI_API_KEY", "BQQPSV2KBlJsUSfoBGByekjs2s")


class SkillsWorker:
    """Skills 后台任务 Worker"""

    VALID_RATIOS = {"auto", "1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21", "1:3", "3:1", "2:1", "1:2"}

    def __init__(self, skill_id: str = "gpt_image_2", concurrency: int = 1):
        self.skill_id = skill_id
        self.concurrency = concurrency
        self._running = False
        self._tasks: Dict[str, asyncio.Task] = {}
        self._queue: Optional[TaskQueue] = None
        self._poll_interval = 3  # 速创 API 轮询间隔（秒）
        self._max_poll_attempts = 60  # 最大轮询次数（180秒）

    async def start(self):
        """启动 Worker"""
        if self._running:
            return
        self._running = True

        queue_mgr = TaskQueueManager()
        self._queue = await queue_mgr.get_queue(self.skill_id)

        # 启动消费协程
        for i in range(self.concurrency):
            task = asyncio.create_task(self._consume_loop(f"worker-{i}"))
            self._tasks[f"worker-{i}"] = task

        print(f"✅ SkillsWorker started (skill={self.skill_id}, concurrency={self.concurrency})")

    async def stop(self):
        """优雅停止 Worker"""
        self._running = False

        # 等待所有消费协程完成
        for name, task in self._tasks.items():
            task.cancel()
        for name, task in self._tasks.items():
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._tasks.clear()

        print("👋 SkillsWorker stopped")

    async def _consume_loop(self, worker_name: str):
        """消费循环"""
        while self._running:
            try:
                task_data = await self._queue.dequeue(timeout=5.0)
                if task_data is None:
                    continue

                task_id = task_data.get("task_id")
                print(f"[{worker_name}] Processing task: {task_id}")

                await self._process_task(task_data)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[{worker_name}] Consume error: {e}")
                traceback.print_exc()
                await asyncio.sleep(1)

    async def _process_task(self, task_data: Dict[str, Any]):
        """
        步骤化处理单个任务

        每一步更新 Redis 任务存储 + 发布 Pub/Sub 进度
        """
        task_id = task_data["task_id"]

        try:
            # Step 1: 参数校验
            await self._publish_step(task_id, "validating", 5, "参数校验中...")
            template_id = task_data.get("template_id")
            form_data = task_data.get("form_data", {})
            size = task_data.get("size", "1024x1024")
            quality = task_data.get("quality", "standard")

            if not template_id:
                raise ValueError("缺少 template_id")

            # Step 2: 构建提示词
            await self._publish_step(task_id, "prompt_building", 15, "构建提示词中...")
            if template_id == "__direct__":
                # 直接模式：form_data 中直接包含 prompt
                prompt = form_data.get("prompt", "")
                if not prompt:
                    raise ValueError("直接模式缺少 prompt")
            else:
                prompt = await self._build_prompt(template_id, form_data)

            # Step 3: 提交速创 API
            await self._publish_step(task_id, "api_submitting", 30, "提交生成请求...")
            remote_id = await self._submit_to_wuyin(prompt, size)

            # Step 4: 轮询结果
            await self._publish_step(task_id, "generating", 50, "AI 生成中...")
            images = await self._poll_wuyin_result(task_id, remote_id)

            # Step 5: 完成
            await self._publish_completed(task_id, images)

            # 更新 Redis 任务存储
            if self._queue:
                await self._queue.update_task(task_id, {
                    "status": "completed",
                    "result": {"images": images},
                    "completed_at": time.time(),
                })

            # 持久化到 PostgreSQL
            await self._save_to_db(task_id, task_data, images)

        except asyncio.CancelledError:
            await self._publish_step(task_id, "cancelled", 0, "任务已取消")
            raise
        except Exception as e:
            error_msg = str(e)
            print(f"[Worker] Task {task_id} failed: {error_msg}")
            traceback.print_exc()

            await self._publish_failed(task_id, error_msg)

            if self._queue:
                await self._queue.update_task(task_id, {
                    "status": "failed",
                    "error": error_msg,
                    "failed_at": time.time(),
                })

            # 持久化失败状态到 PostgreSQL
            await self._save_to_db(task_id, task_data, None, error_msg)

    async def _build_prompt(self, template_id: str, form_data: Dict[str, str]) -> str:
        """使用 PromptBuilder 构建提示词"""
        from app.services.skills import get_skills_loader
        from app.services.skills.gpt_image_2 import PromptBuilder

        loader = get_skills_loader()
        skill = loader.get_skill(self.skill_id)
        if not skill:
            raise ValueError(f"Skill '{self.skill_id}' not found")

        template = skill.get_template(template_id)
        if not template:
            raise ValueError(f"Template '{template_id}' not found")

        builder = PromptBuilder(self.skill_id)
        is_valid, error = builder.validate_form_data(template, form_data)
        if not is_valid:
            raise ValueError(f"表单验证失败: {error}")

        return builder.build_prompt(template, form_data)

    async def _submit_to_wuyin(self, prompt: str, size: str) -> str:
        """提交任务到速创 API，返回 remote_id（含自动重试）"""
        wuyin_size = self._convert_size(size)
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        f"{WUYIN_BASE}/api/async/image_gpt",
                        headers={"Content-Type": "application/json"},
                        json={"key": WUYIN_KEY, "prompt": prompt, "size": wuyin_size},
                    )

                    if resp.status_code >= 500:
                        raise Exception(f"速创 API 服务端错误 (HTTP {resp.status_code})")

                    if resp.status_code != 200:
                        raise Exception(f"速创 API 提交失败 (HTTP {resp.status_code}): {resp.text[:200]}")

                    data = resp.json()
                    if data.get("code") != 200:
                        raise Exception(f"速创 API 返回错误: {data.get('msg', 'unknown')}")

                    remote_id = data.get("data", {}).get("id")
                    if not remote_id:
                        raise Exception("速创 API 未返回任务 ID")

                    return remote_id

            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(5 * (attempt + 1))

        raise Exception(f"速创 API 提交失败（重试 {max_retries} 次）: {last_error}")

    async def _poll_wuyin_result(self, task_id: str, remote_id: str) -> list:
        """轮询速创 API 获取结果"""
        async with httpx.AsyncClient(timeout=60.0, limits=httpx.Limits(max_connections=1)) as client:
            for attempt in range(self._max_poll_attempts):
                if not self._running:
                    raise Exception("Worker 已停止")

                await asyncio.sleep(self._poll_interval)

                resp = await client.get(
                    f"{WUYIN_BASE}/api/async/detail",
                    headers={"Authorization": WUYIN_KEY},
                    params={"key": WUYIN_KEY, "id": remote_id},
                )

                if resp.status_code != 200:
                    continue

                poll_data = resp.json()
                if poll_data.get("code") != 200:
                    continue

                result_info = poll_data.get("data", {})
                status_val = result_info.get("status", 0)

                if status_val == 2 or status_val == 1:
                    # 成功
                    images = result_info.get("result", [])
                    if images:
                        return images
                    raise Exception("速创 API 返回成功但无图片")

                elif status_val == 0:
                    # 处理中，更新进度
                    progress = min(90, 50 + attempt * 0.7)
                    await self._publish_step(
                        task_id, "generating", int(progress),
                        f"AI 生成中... ({attempt + 1}/{self._max_poll_attempts})"
                    )
                    continue

                else:
                    msg = result_info.get("message", "未知错误")
                    raise Exception(f"速创 API 生成失败: {msg}")

        raise Exception(f"生成超时 ({self._max_poll_attempts * self._poll_interval}s)")

    @staticmethod
    def _convert_size(size: str) -> str:
        """透传比例格式，非标准值回退 auto"""
        if size in SkillsWorker.VALID_RATIOS:
            return size
        return "auto"

    async def _publish_step(self, task_id: str, step: str, progress: int, message: str):
        """发布步骤进度"""
        await TaskPublisher.publish_status(
            task_id=task_id,
            status=step,
            progress=progress,
            error=None,
        )
        # 同时存储到 Redis 任务
        if self._queue:
            await self._queue.update_task(task_id, {
                "current_step": step,
                "progress": progress,
                "step_message": message,
            })

    async def _publish_completed(self, task_id: str, images: list):
        """发布完成状态"""
        image_objects = []
        for img in images:
            if isinstance(img, str):
                image_objects.append({"url": img})
            elif isinstance(img, dict):
                image_objects.append(img)

        await TaskPublisher.publish_status(
            task_id=task_id,
            status="completed",
            images=image_objects,
            progress=100,
        )

    async def _publish_failed(self, task_id: str, error: str):
        """发布失败状态"""
        await TaskPublisher.publish_status(
            task_id=task_id,
            status="failed",
            error=error,
            progress=0,
        )

    async def _save_to_db(
        self,
        task_id: str,
        task_data: Dict[str, Any],
        images: Optional[list] = None,
        error: Optional[str] = None,
    ):
        """持久化任务结果到 PostgreSQL ImageTask 表"""
        try:
            from app.database import async_session_maker
            from app.models.api_key import ImageTask

            status = "success" if images else "failed"
            result_data = None
            if images:
                image_objects = []
                for img in images:
                    if isinstance(img, str):
                        image_objects.append({"url": img})
                    elif isinstance(img, dict):
                        image_objects.append(img)
                result_data = {"images": image_objects}

            async with async_session_maker() as session:
                db_task = ImageTask(
                    id=str(uuid.uuid4()),
                    task_id=task_id,
                    model_type="gpt-image-2",
                    status=status,
                    request_params={
                        "prompt": task_data.get("form_data", {}).get("prompt", ""),
                        "template_id": task_data.get("template_id"),
                        "size": task_data.get("size"),
                    },
                    result=result_data,
                    error=error,
                )
                session.add(db_task)
                await session.commit()

        except Exception as db_err:
            print(f"[Worker] DB save failed for task {task_id}: {db_err}")
            traceback.print_exc()


class WorkerManager:
    """Worker 管理器（管理多个 skill 的 Worker）"""

    _instance = None
    _workers: Dict[str, SkillsWorker] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def start_all(self, skill_ids: list = None):
        """启动所有 Worker"""
        if skill_ids is None:
            skill_ids = ["gpt_image_2"]

        for skill_id in skill_ids:
            worker = SkillsWorker(skill_id, concurrency=1)
            await worker.start()
            self._workers[skill_id] = worker

    async def stop_all(self):
        """停止所有 Worker"""
        for skill_id, worker in self._workers.items():
            await worker.stop()
        self._workers.clear()

    async def get_status(self) -> Dict[str, Any]:
        """获取所有 Worker 状态"""
        statuses = {}
        for skill_id, worker in self._workers.items():
            queue_mgr = TaskQueueManager()
            queue = await queue_mgr.get_queue(skill_id)
            queue_info = await queue.get_queue_info()
            statuses[skill_id] = {
                "running": worker._running,
                "concurrency": worker.concurrency,
                "queue_length": queue_info["length"],
            }
        return statuses
