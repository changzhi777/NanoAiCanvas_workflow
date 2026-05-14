"""
TVC 工作流任务执行器
- 异步执行 5 步线性流程
- Redis 存储进度 + 断点续传
- WebSocket 推送实时状态
"""

import json
import asyncio
import time
from typing import Optional
from app.redis import redis_client
from app.config import get_settings


TASK_PREFIX = "tvc_task:"
TASK_TTL = 86400  # 24h
CHANNEL_PREFIX = "tvc_task_ch:"


def _task_key(task_id: str) -> str:
    return f"{TASK_PREFIX}{task_id}"


def _channel(task_id: str) -> str:
    return f"{CHANNEL_PREFIX}{task_id}"


async def _publish(task_id: str, state: dict):
    """发布状态到 Redis Pub/Sub"""
    await redis_client.publish(_channel(task_id), json.dumps(state, ensure_ascii=False))


async def _save(task_id: str, state: dict):
    """保存状态到 Redis"""
    await redis_client.setex(_task_key(task_id), TASK_TTL, json.dumps(state, ensure_ascii=False))


async def load_task(task_id: str) -> Optional[dict]:
    """加载任务状态"""
    raw = await redis_client.get(_task_key(task_id))
    return json.loads(raw) if raw else None


async def create_task(task_id: str, workflow_id: str, nodes: list) -> dict:
    """创建任务"""
    state = {
        "task_id": task_id,
        "workflow_id": workflow_id,
        "status": "submitted",
        "overall_progress": 0,
        "nodes": nodes,
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    await _save(task_id, state)
    await _publish(task_id, state)
    return state


def _recalc_progress(state: dict):
    """重算 overall_progress"""
    total = len(state["nodes"])
    done = sum(1 for n in state["nodes"] if n.get("status") == "success")
    running = sum(1 for n in state["nodes"] if n.get("status") == "running")
    running_progress = sum(n.get("progress", 0) for n in state["nodes"] if n.get("status") == "running")
    state["overall_progress"] = int((done / total) * 100) if total > 0 else 0
    if running > 0:
        state["overall_progress"] = min(99, state["overall_progress"] + int(running_progress / total))


async def update_node(task_id: str, node_index: int, updates: dict):
    """更新某个节点的状态（CAS 乐观锁防竞态）"""
    for _ in range(3):
        state = await load_task(task_id)
        if not state:
            return
        node = state["nodes"][node_index]
        node.update(updates)
        node["updated_at"] = time.time()

        _recalc_progress(state)

        state["updated_at"] = time.time()
        key = _task_key(task_id)
        # CAS: 仅当 Redis 中值未变时才写入
        pipe = redis_client.pipeline()
        pipe.watch(key)
        current = await redis_client.get(key)
        if current:
            pipe.multi()
            pipe.setex(key, TASK_TTL, json.dumps(state, ensure_ascii=False))
            try:
                await pipe.execute()
            except Exception:
                continue  # watch 触发，重试
        else:
            await pipe.reset()
        await _publish(task_id, state)
        return


async def update_subtask(task_id: str, node_index: int, subtask_id: str, updates: dict):
    """更新子任务状态（CAS 乐观锁防竞态）"""
    for _ in range(3):
        state = await load_task(task_id)
        if not state:
            return
        node = state["nodes"][node_index]
        subtasks = node.setdefault("subtasks", [])
        for st in subtasks:
            if st.get("id") == subtask_id:
                st.update(updates)
                break

        total_st = len(subtasks)
        done_st = sum(1 for st in subtasks if st.get("status") == "success")
        node["progress"] = int((done_st / total_st) * 100) if total_st > 0 else 0

        _recalc_progress(state)

        state["updated_at"] = time.time()
        key = _task_key(task_id)
        pipe = redis_client.pipeline()
        pipe.watch(key)
        current = await redis_client.get(key)
        if current:
            pipe.multi()
            pipe.setex(key, TASK_TTL, json.dumps(state, ensure_ascii=False))
            try:
                await pipe.execute()
            except Exception:
                continue
        else:
            await pipe.reset()
        await _publish(task_id, state)
        return


async def complete_task(task_id: str, status: str = "completed"):
    """标记任务完成"""
    state = await load_task(task_id)
    if not state:
        return
    state["status"] = status
    state["overall_progress"] = 100 if status == "completed" else state["overall_progress"]
    state["completed_at"] = time.time()
    state["updated_at"] = time.time()
    await _save(task_id, state)
    await _publish(task_id, state)


async def fail_task(task_id: str, error: str):
    """标记任务失败"""
    state = await load_task(task_id)
    if not state:
        return
    state["status"] = "failed"
    state["error"] = error
    state["updated_at"] = time.time()
    await _save(task_id, state)
    await _publish(task_id, state)
