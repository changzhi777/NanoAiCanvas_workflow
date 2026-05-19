# Nanoai Team8 Agent System — MCP Bridge
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

"""
MCP Server — stdio 子进程模式，通过 Redis Pub/Sub 与 Gateway 通信。

启动方式:
  python -m app.services.agent.mcp.bridge

工具列表:
  - agent_chat: 与 Agent 对话
  - start_pipeline: 启动改编流水线
  - get_pipeline_status: 查询流水线状态
  - list_agents: 列出可用 Agent
  - get_about: 获取系统信息
"""

import asyncio
import json
import sys
import uuid
import logging

from app.redis import redis_client

logger = logging.getLogger(__name__)

MCP_REQUEST_CHANNEL = "agent:mcp:request"
MCP_RESPONSE_PREFIX = "agent:mcp:response:"
MCP_RESPONSE_TIMEOUT = 60  # seconds


async def handle_request(request: dict) -> dict:
    """处理 MCP 请求并通过 Redis 转发给 Gateway"""
    request_id = str(uuid.uuid4())
    response_channel = f"{MCP_RESPONSE_PREFIX}{request_id}"

    # 订阅响应频道
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(response_channel)

    # 发布请求
    request["_request_id"] = request_id
    request["_response_channel"] = response_channel
    await redis_client.publish(MCP_REQUEST_CHANNEL, json.dumps(request, ensure_ascii=False))

    # 等待响应
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                if data.get("_request_id") == request_id:
                    return data
    except asyncio.TimeoutError:
        return {"error": "Gateway response timeout"}
    finally:
        await pubsub.unsubscribe(response_channel)
        await pubsub.close()

    return {"error": "No response from gateway"}


def list_tools() -> list[dict]:
    """返回 MCP 工具列表"""
    return [
        {
            "name": "agent_chat",
            "description": "与指定 Agent 对话",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "messages": {"type": "array", "items": {"type": "object"}, "description": "消息列表"},
                    "agent": {"type": "string", "default": "producer", "description": "Agent名称"},
                    "model": {"type": "string", "description": "覆盖模型（可选）"},
                },
                "required": ["messages"],
            },
        },
        {
            "name": "start_pipeline",
            "description": "启动改编流水线",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "用户ID"},
                    "params": {"type": "object", "description": "流水线参数"},
                    "pipeline_type": {"type": "string", "default": "adaptation"},
                },
                "required": ["user_id", "params"],
            },
        },
        {
            "name": "get_pipeline_status",
            "description": "查询流水线状态",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "任务ID"},
                },
                "required": ["task_id"],
            },
        },
        {
            "name": "list_agents",
            "description": "列出所有可用 Agent",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "get_about",
            "description": "获取系统信息",
            "inputSchema": {"type": "object", "properties": {}},
        },
    ]


async def run_stdio():
    """MCP stdio 主循环"""
    # 发送初始化响应
    init_response = {
        "jsonrpc": "2.0",
        "id": None,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "nanoai-team8-mcp", "version": "0.1.0"},
        },
    }
    print(json.dumps(init_response), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            method = request.get("method", "")
            params = request.get("params", {})
            req_id = request.get("id")

            if method == "tools/list":
                response = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": list_tools()}}
            elif method == "tools/call":
                tool_name = params.get("name", "")
                tool_args = params.get("arguments", {})
                result = await handle_request({"tool": tool_name, **tool_args})
                response = {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}]}}
            else:
                response = {"jsonrpc": "2.0", "id": req_id, "result": {}}

            print(json.dumps(response), flush=True)

        except json.JSONDecodeError:
            print(json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}), flush=True)
        except Exception as e:
            print(json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}), flush=True)


if __name__ == "__main__":
    asyncio.run(run_stdio())
