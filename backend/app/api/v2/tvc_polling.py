"""
TVC 异步任务轮询函数
3 个视频 Provider 的结果轮询逻辑
"""
import httpx
import asyncio


async def poll_glm_video(api_key: str, base_url: str, task_id: str, max_wait: int = 300, interval: int = 15) -> str:
    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            resp = await client.get(
                f"{base_url}/async-result/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            task_status = data.get("task_status", "")

            if task_status == "SUCCESS":
                video_result = data.get("video_result", [])
                if isinstance(video_result, list) and video_result:
                    return video_result[0].get("url", "")
                result = data.get("results", data.get("data", {}))
                if isinstance(result, list) and result:
                    return result[0].get("url", "")
                if isinstance(result, dict):
                    return result.get("url", result.get("video_url", ""))
                raise Exception(f"CogVideoX-3 succeeded but no video URL: {data}")

            if task_status in ("FAIL", "FAILED"):
                error_msg = data.get("error", {}).get("message", data.get("message", "Unknown error"))
                raise Exception(f"CogVideoX-3 task failed: {error_msg}")

    raise Exception(f"CogVideoX-3 task timeout after {max_wait}s (task: {task_id})")


async def poll_seedance(api_key: str, base_url: str, task_id: str, max_wait: int = 300, interval: int = 15) -> str:
    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            resp = await client.get(
                f"{base_url}/contents/generations/tasks/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            status = data.get("status", "")

            if status in ("succeeded", "success"):
                result_data = data.get("data", [])
                if isinstance(result_data, list) and result_data:
                    return result_data[0].get("url", "")
                if isinstance(result_data, dict):
                    return result_data.get("url", "")
                content = data.get("content", {})
                if isinstance(content, dict):
                    return content.get("video_url", content.get("url", ""))
                raise Exception(f"Seedance succeeded but no video URL: {data}")

            if status in ("failed", "error"):
                error_msg = data.get("error", {}).get("message", "Unknown error")
                raise Exception(f"Seedance task failed: {error_msg}")

    raise Exception(f"Seedance task timeout after {max_wait}s (task: {task_id})")


async def poll_minimax_video(api_key: str, base_url: str, task_id: str, max_wait: int = 300, interval: int = 15) -> str:
    elapsed = 0
    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < max_wait:
            await asyncio.sleep(interval)
            elapsed += interval

            resp = await client.get(
                f"{base_url}/query/video_generation?task_id={task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            base_resp = data.get("base_resp", {})
            if base_resp.get("status_code", 0) != 0:
                raise Exception(f"MiniMax video query failed: {base_resp.get('status_msg', 'unknown')}")

            status = data.get("status", "")

            if status == "Success":
                file_id = data.get("file_id", "")
                if not file_id:
                    raise Exception(f"MiniMax Success but no file_id: {data}")
                return file_id

            if status == "Fail":
                raise Exception(f"MiniMax video task failed: {data}")

    raise Exception(f"MiniMax video timeout after {max_wait}s (task: {task_id})")
