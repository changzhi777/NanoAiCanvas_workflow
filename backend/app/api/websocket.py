"""
WebSocket 端点 - 任务状态实时推送
使用 Redis Pub/Sub 实现前端实时接收任务状态
"""
import asyncio
import json
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from starlette.routing import WebSocketRoute

from app.services.pubsub import TaskSubscriber, TaskPublisher


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # task_id -> WebSocket 连接列表
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: str) -> None:
        """接受 WebSocket 连接并注册到任务频道"""
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)

    def disconnect(self, websocket: WebSocket, task_id: str) -> None:
        """断开 WebSocket 连接"""
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]

    async def broadcast_to_task(self, task_id: str, message: dict) -> None:
        """向特定任务的所有连接广播消息"""
        if task_id in self.active_connections:
            dead_connections = []
            for websocket in self.active_connections[task_id]:
                try:
                    await websocket.send_json(message)
                except Exception:
                    dead_connections.append(websocket)
            # 清理无效连接
            for ws in dead_connections:
                self.disconnect(ws, task_id)


# 全局连接管理器
manager = ConnectionManager()


async def websocket_task_status(websocket: WebSocket, task_id: str) -> None:
    """
    WebSocket 端点 - 订阅任务状态实时更新

    WS URL: /ws/tasks/{task_id}

    前端连接后，后端从 Redis 订阅频道并推送状态更新
    """
    await manager.connect(websocket, task_id)

    subscriber = TaskSubscriber()
    subscriber_id = await subscriber.subscribe(task_id)

    try:
        # 立即发送已连接消息
        await websocket.send_json({
            "type": "connected",
            "task_id": task_id,
            "message": "已连接到任务状态更新"
        })

        # 持续接收并转发消息
        while True:
            message = await subscriber.get_message(timeout=30.0)
            if message:
                await websocket.send_json(message)

            # 发送心跳保活
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"WebSocket error: {e}")
    finally:
        subscriber.close()
        manager.disconnect(websocket, task_id)


# 用于 FastAPI 路由注册
websocket_routes = [
    WebSocketRoute("/ws/tasks/{task_id}", websocket_task_status),
]
