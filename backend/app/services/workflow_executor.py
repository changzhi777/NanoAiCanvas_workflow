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

# 分步耗时权重（经验值；EMA 平滑的动态 ETA 依据）
_STEP_WEIGHTS = {
    "script": 0.15,      # 剧本生成（LLM）
    "optimize": 0.12,    # 提示词优化（LLM）
    "breakdown": 0.03,   # 分镜拆分（纯逻辑）
    "images": 0.30,      # 参考图 ×2（并行）
    "video": 0.33,       # 分镜视频（H3，最大头）
    "bgm": 0.07,         # BGM
}
_DEFAULT_WEIGHT = 0.1


def _compute_eta(state: dict) -> dict:
    """分步权重线性外推 ETA + EMA 平滑。

    returns: {eta_seconds: int|None, elapsed_seconds: int, eta_confidence: str}
    """
    started = state.get("started_at") or state.get("created_at")
    if not started:
        return {"eta_seconds": None, "elapsed_seconds": 0, "eta_confidence": "low"}

    elapsed = max(0, time.time() - started)
    status = state.get("status")
    if status in ("completed", "failed", "cancelled"):
        return {"eta_seconds": 0 if status == "completed" else None,
                "elapsed_seconds": int(elapsed), "eta_confidence": "high"}

    # 已完成权重（success 全计；running 按进度半计，避免低估）
    w_done = 0.0
    for n in state.get("nodes", []):
        w = _STEP_WEIGHTS.get(n.get("type", ""), _DEFAULT_WEIGHT)
        st = n.get("status")
        if st == "success":
            w_done += w
        elif st == "running":
            w_done += w * 0.5 * (n.get("progress", 0) / 100.0)

    if w_done < 0.08:
        # 刚开始：样本不足，不给 ETA（前端可显示静态预估）
        return {"eta_seconds": None, "elapsed_seconds": int(elapsed), "eta_confidence": "low"}

    eta = elapsed * (1 - w_done) / w_done
    # EMA 平滑：与上次推送值融合，防数字跳动
    prev = state.get("eta_seconds")
    if isinstance(prev, (int, float)) and prev > 0:
        eta = 0.7 * prev + 0.3 * eta
    eta = int(max(5, min(3600, eta)))  # clamp 5s ~ 1h

    confidence = "high" if w_done >= 0.6 else ("mid" if w_done >= 0.25 else "low")
    return {"eta_seconds": eta, "elapsed_seconds": int(elapsed), "eta_confidence": confidence}


def _attach_eta(state: dict):
    """计算并附加 ETA 字段到 state（所有保存路径统一调用）"""
    state.update(_compute_eta(state))


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
    now = time.time()
    state = {
        "task_id": task_id,
        "workflow_id": workflow_id,
        "status": "submitted",
        "overall_progress": 0,
        "nodes": nodes,
        "created_at": now,
        "started_at": now,  # ETA 基准
        "updated_at": now,
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
        # node 级首启时间（ETA 校准用）
        if updates.get("status") == "running" and "started_at" not in node:
            node["started_at"] = time.time()

        _recalc_progress(state)
        _attach_eta(state)

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
        _attach_eta(state)

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
    _attach_eta(state)
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
    _attach_eta(state)
    state["updated_at"] = time.time()
    await _save(task_id, state)
    await _publish(task_id, state)
