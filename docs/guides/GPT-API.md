# GPT-Image-2 文生图 API 开发文档

> 基于 wuyinkeji（速创）GPT-Image-2 代理 API 的完整接口文档与参考代码
>
> **适用场景**: 后台程序对接文生图功能、独立服务开发、API 集成参考
>
> **生成时间**: 2026-08-11

---

## 目录

1. [API 概述](#1-api-概述)
2. [认证方式](#2-认证方式)
3. [核心接口](#3-核心接口)
   - 3.1 [提交生成任务](#31-提交生成任务)
   - 3.2 [查询任务状态](#32-查询任务状态)
4. [异步处理流程](#4-异步处理流程)
5. [参数详解](#5-参数详解)
6. [响应格式](#6-响应格式)
7. [错误处理](#7-错误处理)
8. [参考代码](#8-参考代码)
   - 8.1 [Python 异步完整实现](#81-python-异步完整实现推荐)
   - 8.2 [Python 同步简化版](#82-python-同步简化版)
   - 8.3 [TypeScript/Node.js 实现](#83-typescriptnodejs-实现)
   - 8.4 [FastAPI 后端路由封装](#84-fastapi-后端路由封装)
   - 8.5 [Provider 工厂模式封装](#85-provider-工厂模式封装)
9. [架构设计模式](#9-架构设计模式)
10. [最佳实践](#10-最佳实践)

---

## 1. API 概述

| 项目 | 说明 |
|------|------|
| **API 服务商** | wuyinkeji（速创 API） |
| **Base URL** | `https://api.wuyinkeji.com` |
| **底层模型** | OpenAI GPT-Image-2（新一代图像生成模型） |
| **调用模式** | 异步：提交任务 → 轮询结果 → 下载图片 |
| **频率限制** | 100 QPS（100 次/秒） |
| **计费** | 约 0.1 元/张 |
| **支持功能** | 文生图、图生图、图片修改 |
| **文档地址** | https://api.wuyinkeji.com/doc/53 |

### 同系列可用模型

| model_type | 端点 | 认证方式 | 说明 |
|------------|------|----------|------|
| `gpt-image-2` | `/api/async/image_gpt` | JSON body 内 `key` 字段 | GPT-Image-2 文生图 |
| `nano-banana2` | `/api/async/image_nanoBanana2` | Query param `?key=` + form-data | NanoBanana2 文/图生图 |
| `nano-banana-pro` | `/api/async/image_nanoBanana2` | Query param `?key=` + form-data | NanoBanana Pro |

---

## 2. 认证方式

GPT-Image-2 使用 **JSON body 内嵌 key** 认证（非 Header、非 Query）：

```
POST /api/async/image_gpt
Content-Type: application/json

{
  "key": "你的API密钥",
  "prompt": "生成内容描述",
  "size": "1K"
}
```

> **注意**: NanoBanana2 系列使用不同的认证方式（`?key=xxx` Query param + form-data），不要混淆。

---

## 3. 核心接口

### 3.1 提交生成任务

**端点**: `POST /api/async/image_gpt`

**请求头**:
```
Content-Type: application/json
```

**请求体**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `key` | string | ✅ | - | API 密钥 |
| `prompt` | string | ✅ | - | 图片生成提示词（建议英文，效果更佳） |
| `size` | string | ❌ | `"1K"` | 输出尺寸，见下方尺寸表 |

**尺寸参数 (`size`)**:

| 值 | 分辨率 | 说明 |
|----|--------|------|
| `"1K"` | ~1024×1024 | 标准正方形（默认） |
| `"auto"` | 自动选择 | 由模型决定最佳尺寸 |
| `"1024x1024"` | 1024×1024 | 显式指定正方形 |
| `"1024x1536"` | 1024×1536 | 竖版 |
| `"1536x1024"` | 1536×1024 | 横版 |

**请求示例**:

```bash
curl -X POST https://api.wuyinkeji.com/api/async/image_gpt \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "prompt": "Cinematic realistic animation, 1940s Chinese coastal port, warm golden light, painterly style, no real people",
    "size": "1K"
  }'
```

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": "image_670608d3-03b5-4b37-bddf-34659fb95fcf"
  }
}
```

**失败响应**:

```json
{
  "code": 400,
  "msg": "Invalid API key",
  "data": null
}
```

> ⚠️ **关键**: 返回的 `data.id` 是任务 ID，用于后续轮询。此时图片尚未生成。

---

### 3.2 查询任务状态

**端点**: `GET /api/async/detail`

**Query 参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | ✅ | API 密钥 |
| `id` | string | ✅ | 提交任务返回的 task_id |

**请求示例**:

```bash
curl "https://api.wuyinkeji.com/api/async/detail?key=YOUR_API_KEY&id=image_670608d3-03b5-4b37-bddf-34659fb95fcf"
```

**处理中响应** (status=0):

```json
{
  "code": 200,
  "data": {
    "status": 0,
    "result": null
  }
}
```

**成功响应** (status=2):

```json
{
  "code": 200,
  "data": {
    "status": 2,
    "result": "https://cdn.wuyinkeji.com/generated/xxx.png"
  }
}
```

> **result 字段格式不固定**，可能是：
> - **string**: 直接图片 URL
> - **list**: `[{"url": "..."}]` 或 `["url1", "url2"]`
> - **dict**: `{"url": "..."}`
>
> 代码需做类型判断处理（见参考代码）。

**失败响应** (status 非 0 非 2):

```json
{
  "code": 200,
  "data": {
    "status": 3,
    "result": "Content policy violation"
  }
}
```

**状态码汇总**:

| status 值 | 含义 | 处理方式 |
|-----------|------|----------|
| `0` | 处理中 | 继续轮询 |
| `2` | 成功 | 提取 result 中的图片 URL |
| 其他 | 失败 | 读取错误信息，终止或重试 |

---

## 4. 异步处理流程

```
┌─────────────┐     POST /api/async/image_gpt     ┌─────────────┐
│   客户端     │ ──────────────────────────────────→│  wuyinkeji   │
│             │ ←──────────────────────────────────│    API       │
│             │     { code:200, data:{ id:"xxx" } } │             │
│             │                                    └─────────────┘
│             │                                           │
│             │     GET /api/async/detail?key=&id=         │ 调用
│             │ ──────────────────────────────────→        │ OpenAI
│             │ ←──────────────────────────────────         │ GPT-Image-2
│             │     { status: 0 }  ← 处理中                 │
│             │                                           │
│             │     (等待 3s 后重试)                        │
│             │ ──────────────────────────────────→        │
│             │ ←──────────────────────────────────         │
│             │     { status: 2, result: "url" }  ← 完成   │
│             │                                           │
│             │     GET result_url                         │
│             │ ──────────────────────────────────→  CDN   │
│             │ ←──────────────────────────────────         │
│             │     [二进制图片数据]                        │
└─────────────┘                                           └
```

**关键参数**:

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| 轮询间隔 | 3 秒 | 太快浪费请求，太慢影响体验 |
| 最大轮询次数 | 40 次 | 40×3s = 120s 超时 |
| 下载超时 | 60 秒 | 大图下载预留时间 |
| HTTP 超时 | 120 秒 | 整体请求超时 |

---

## 5. 参数详解

### Prompt 编写建议

GPT-Image-2 对英文 prompt 响应最佳，推荐结构化描述：

```
[风格], [主体场景], [细节描述], [光影氛围], [构图方式], [排除项]
```

**示例**:

```
✅ 好的 Prompt:
"Cinematic realistic animation, 1940s Chinese coastal port, a young man 
standing at dock gazing at ocean liner, sepia warm golden light, 
departure scene, melancholic farewell atmosphere, wide composition, 
no real people, painterly animation style"

❌ 差的 Prompt:
"一个男的在码头"
```

### Prompt 进阶技巧

| 技巧 | 说明 | 示例 |
|------|------|------|
| **风格前置** | 风格词放句首 | `Cinematic realistic animation, ...` |
| **排除词** | 用 `no` 排除不需要的元素 | `no real people, no text overlay` |
| **光影控制** | 明确光源和色温 | `warm amber glow, dust particles in sunbeam` |
| **构图指令** | 指定镜头角度 | `wide composition` / `close-up` / `aerial view` |
| **情绪词汇** | 引导氛围 | `melancholic`, `nostalgic`, `epic` |

---

## 6. 响应格式

### result 字段的多种形态

```python
# 形态 1: 字符串 URL（最常见）
result = "https://cdn.wuyinkeji.com/generated/xxx.png"

# 形态 2: 列表（字符串元素）
result = ["https://cdn.wuyinkeji.com/generated/xxx.png"]

# 形态 3: 列表（字典元素）
result = [{"url": "https://cdn.wuyinkeji.com/generated/xxx.png"}]

# 形态 4: 字典
result = {"url": "https://cdn.wuyinkeji.com/generated/xxx.png"}
```

**安全提取 URL 的通用代码**:

```python
def extract_image_url(result_data) -> str | None:
    """从 result 字段安全提取图片 URL"""
    if isinstance(result_data, str):
        return result_data
    elif isinstance(result_data, list) and result_data:
        first = result_data[0]
        if isinstance(first, str):
            return first
        elif isinstance(first, dict):
            return first.get("url", "")
    elif isinstance(result_data, dict):
        return result_data.get("url", "")
    return None
```

---

## 7. 错误处理

### 常见错误

| 错误场景 | code | 处理方式 |
|----------|------|----------|
| API Key 无效 | 400 | 检查 key 是否正确 |
| 余额不足 | 402 | 充值或更换 key |
| Prompt 违规 | 200 + status≠0 | 修改 prompt 内容 |
| 频率超限 | 429 | 降低请求频率 |
| 网络超时 | - | 重试机制 |
| 任务超时（120s 未完成）| - | 重试或通知用户 |

### 重试策略

```python
# 推荐重试参数
max_retries = 2          # 最多重试 2 次（共 3 次尝试）
retry_interval = 5       # 重试间隔 5 秒
poll_interval = 3        # 轮询间隔 3 秒
poll_max_attempts = 40   # 最多轮询 40 次（120s 超时）
```

---

## 8. 参考代码

### 8.1 Python 异步完整实现（推荐）

> 来源：`scripts/ahma_love_letter.py`（生产环境验证，已生成多张 AI 插画）

```python
import asyncio
import httpx
from pathlib import Path

WUYINKEJI_BASE = "https://api.wuyinkeji.com"
WUYINKEJI_API_KEY = "YOUR_API_KEY"  # 建议从环境变量读取


async def generate_gpt_image(
    prompt: str,
    output_path: Path,
    api_key: str = WUYINKEJI_API_KEY,
    size: str = "1K",
    max_retries: int = 2,
) -> bool:
    """
    调用 wuyinkeji GPT-Image-2 API（含重试，间隔 5s）
    
    Args:
        prompt: 图片生成提示词
        output_path: 输出文件路径
        api_key: wuyinkeji API Key
        size: 输出尺寸（"1K" / "1024x1024" / "auto"）
        max_retries: 最大重试次数
    
    Returns:
        True 成功，False 失败
    """
    for attempt in range(1, max_retries + 1):
        print(f"🎨 GPT-Image-2 生成 (第{attempt}/{max_retries}次): {prompt[:60]}...")
        if await _generate_once(prompt, output_path, api_key, size):
            return True
        if attempt < max_retries:
            print("⏳ 5s 后重试...")
            await asyncio.sleep(5)
    return False


async def _generate_once(
    prompt: str,
    output_path: Path,
    api_key: str,
    size: str,
) -> bool:
    """单次调用：提交 → 轮询 → 下载"""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            # Step 1: 提交任务
            resp = await client.post(
                f"{WUYINKEJI_BASE}/api/async/image_gpt",
                headers={"Content-Type": "application/json"},
                json={
                    "key": api_key,
                    "prompt": prompt,
                    "size": size,
                },
            )
            result = resp.json()

            if result.get("code") != 200:
                print(f"❌ 提交失败: {result.get('msg', 'Unknown')}")
                return False

            task_id = result.get("data", {}).get("id", "")
            if not task_id:
                print(f"❌ 无任务ID: {result}")
                return False

            print(f"⏳ 任务ID: {task_id}, 轮询中...")

            # Step 2: 轮询（最多 120s，每 3s 一次）
            for attempt in range(40):
                await asyncio.sleep(3)
                poll_resp = await client.get(
                    f"{WUYINKEJI_BASE}/api/async/detail",
                    params={"key": api_key, "id": task_id},
                )
                poll_data = poll_resp.json()
                data = poll_data.get("data", {})
                status = data.get("status", 0)

                if status == 2:
                    # 成功 — 提取图片 URL
                    result_data = data.get("result", "")
                    image_url = _extract_image_url(result_data)

                    if not image_url:
                        print(f"❌ 无图片URL: {data}")
                        return False

                    # Step 3: 下载图片
                    img_resp = await client.get(image_url, timeout=60)
                    output_path.write_bytes(img_resp.content)
                    print(f"✅ 已保存: {output_path.name}")
                    return True

                elif status != 0:
                    # 失败
                    print(f"❌ 任务失败: status={status}")
                    return False

                # status=0 继续等待
                if attempt % 5 == 4:
                    print(f"  ... 仍在生成中 ({(attempt+1)*3}s)")

            print("❌ 超时（120s）")
            return False

    except Exception as e:
        print(f"❌ 异常: {e}")
        return False


def _extract_image_url(result_data) -> str:
    """从 API 返回的 result 字段安全提取图片 URL"""
    if isinstance(result_data, str):
        return result_data
    elif isinstance(result_data, list) and result_data:
        first = result_data[0]
        if isinstance(first, str):
            return first
        elif isinstance(first, dict):
            return first.get("url", "")
    elif isinstance(result_data, dict):
        return result_data.get("url", "")
    return ""


# ─── 使用示例 ───────────────────────────────────────────

async def main():
    # 单张生成
    success = await generate_gpt_image(
        prompt="Cinematic realistic animation, elderly woman reading letter, "
               "warm golden afternoon light, painterly style, no real people",
        output_path=Path("./output.png"),
    )
    if success:
        print("生成成功！")

    # 并发批量生成
    tasks = [
        ("prompt 1 description", Path("./img1.png")),
        ("prompt 2 description", Path("./img2.png")),
        ("prompt 3 description", Path("./img3.png")),
    ]
    results = await asyncio.gather(
        *[generate_gpt_image(p, d) for p, d in tasks]
    )
    print(f"成功 {sum(results)}/{len(tasks)} 张")


if __name__ == "__main__":
    asyncio.run(main())
```

---

### 8.2 Python 同步简化版

> 来源：`scripts/test-image-api.py`（适配）

```python
import requests
import time
from pathlib import Path

API_BASE = "https://api.wuyinkeji.com"
API_KEY = "YOUR_API_KEY"


def submit_task(prompt: str, size: str = "1K") -> str | None:
    """提交 GPT-Image-2 生成任务，返回 task_id"""
    resp = requests.post(
        f"{API_BASE}/api/async/image_gpt",
        headers={"Content-Type": "application/json"},
        json={"key": API_KEY, "prompt": prompt, "size": size},
        timeout=30,
    )
    result = resp.json()
    if result.get("code") != 200:
        print(f"提交失败: {result.get('msg')}")
        return None
    return result.get("data", {}).get("id")


def poll_task(task_id: str, max_attempts: int = 40, interval: int = 3) -> dict | None:
    """轮询任务状态直到完成或超时"""
    for i in range(max_attempts):
        resp = requests.get(
            f"{API_BASE}/api/async/detail",
            params={"key": API_KEY, "id": task_id},
            timeout=30,
        )
        data = resp.json().get("data", {})
        status = data.get("status", 0)

        if status == 2:
            return data  # 成功
        elif status != 0:
            print(f"任务失败: status={status}")
            return data  # 失败

        print(f"  轮询 {i+1}/{max_attempts}: 处理中...")
        time.sleep(interval)

    print("超时")
    return None


def download_image(url: str, output_path: str):
    """下载生成的图片"""
    resp = requests.get(url, timeout=60)
    Path(output_path).write_bytes(resp.content)
    print(f"✅ 已下载: {output_path}")


# ─── 完整调用流程 ───────────────────────────────────────

task_id = submit_task("A beautiful sunset over the ocean, oil painting style")
if task_id:
    result = poll_task(task_id)
    if result and result.get("status") == 2:
        image_url = result.get("result", "")
        if isinstance(image_url, list):
            image_url = image_url[0] if isinstance(image_url[0], str) else image_url[0].get("url")
        download_image(image_url, "output.png")
```

---

### 8.3 TypeScript/Node.js 实现

```typescript
/**
 * Wuyinkeji GPT-Image-2 API Client (TypeScript)
 * 
 * 依赖: 无（使用原生 fetch，Node 18+）
 */

const WUYINKEJI_BASE = "https://api.wuyinkeji.com";

interface SubmitResponse {
  code: number;
  msg: string;
  data: { id: string };
}

interface PollResponse {
  code: number;
  data: {
    status: number;  // 0=处理中, 2=成功, 其他=失败
    result: string | string[] | { url: string }[];
  };
}

/** 提交图片生成任务 */
async function submitTask(
  apiKey: string,
  prompt: string,
  size: string = "1K"
): Promise<string> {
  const resp = await fetch(`${WUYINKEJI_BASE}/api/async/image_gpt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: apiKey, prompt, size }),
  });

  const data: SubmitResponse = await resp.json();
  if (data.code !== 200) {
    throw new Error(`提交失败: ${data.msg}`);
  }

  const taskId = data.data?.id;
  if (!taskId) throw new Error("未返回任务 ID");
  return taskId;
}

/** 轮询任务状态 */
async function pollTask(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 40,
  interval: number = 3000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);

    const resp = await fetch(
      `${WUYINKEJI_BASE}/api/async/detail?key=${apiKey}&id=${taskId}`
    );
    const data: PollResponse = await resp.json();
    const status = data.data?.status ?? 0;

    if (status === 2) {
      // 成功 — 提取 URL
      return extractImageUrl(data.data.result);
    } else if (status !== 0) {
      throw new Error(`任务失败: status=${status}`);
    }

    if ((i + 1) % 5 === 0) {
      console.log(`  ... 仍在生成中 (${(i + 1) * (interval / 1000)}s)`);
    }
  }
  throw new Error("轮询超时（120s）");
}

/** 从 result 字段提取图片 URL */
function extractImageUrl(result: any): string {
  if (typeof result === "string") return result;
  if (Array.isArray(result) && result.length > 0) {
    if (typeof result[0] === "string") return result[0];
    if (typeof result[0] === "object") return result[0].url ?? "";
  }
  if (typeof result === "object" && result.url) return result.url;
  return "";
}

/** 下载图片到 Buffer */
async function downloadImage(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`下载失败: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

/** 完整生成流程（含重试） */
export async function generateImage(
  apiKey: string,
  prompt: string,
  maxRetries: number = 2
): Promise<Buffer> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎨 GPT-Image-2 (第${attempt}/${maxRetries}次): ${prompt.slice(0, 60)}...`);

      const taskId = await submitTask(apiKey, prompt);
      console.log(`⏳ 任务ID: ${taskId}`);

      const imageUrl = await pollTask(apiKey, taskId);
      const imageBuffer = await downloadImage(imageUrl);

      console.log("✅ 生成成功");
      return imageBuffer;
    } catch (err) {
      console.error(`❌ 第${attempt}次失败:`, err);
      if (attempt < maxRetries) {
        console.log("⏳ 5s 后重试...");
        await sleep(5000);
      }
    }
  }
  throw new Error(`生成失败（${maxRetries}次重试后仍失败）`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── 使用示例 ───────────────────────────────────────────

// 单张生成
// const img = await generateImage("YOUR_KEY", "prompt here");
// fs.writeFileSync("output.png", img);

// 并发批量
// const prompts = ["prompt1", "prompt2", "prompt3"];
// const results = await Promise.all(
//   prompts.map((p) => generateImage("YOUR_KEY", p).catch(() => null))
// );
```

---

### 8.4 FastAPI 后端路由封装

> 来源：`backend/app/api/v2/image.py`（生产环境运行中）

```python
"""
V2 图片生成 API 路由
支持多 Provider、多模型、API Key 路由
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/v2/image", tags=["v2-image"])


class ImageGenerateRequest(BaseModel):
    model_type: str = "gpt-image-2"  # gpt-image-2 / nano-banana2 / nano-banana-pro
    prompt: str
    size: str = "1K"
    aspect_ratio: str = "auto"
    urls: List[str] = []             # 图生图参考 URL


class TaskSubmitResponse(BaseModel):
    task_id: str
    status: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str                       # pending / processing / success / failed
    images: Optional[List[dict]] = None
    error: Optional[str] = None


@router.post("/gpt-image-2/generate", response_model=TaskSubmitResponse)
async def submit_gpt_image_task(
    request: ImageGenerateRequest,
    api_key: str = Depends(get_api_key),  # 从 DB 获取 backend key
):
    """提交 GPT-Image-2 生成任务"""
    request.model_type = "gpt-image-2"
    # ... 调用 Provider 提交任务，存储到 DB ...
    return TaskSubmitResponse(task_id="image_xxx", status="pending")


@router.get("/gpt-image-2/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """查询任务状态（自动从 Provider 轮询更新）"""
    # ... 从 DB 查询 + Provider 同步状态 ...
    return TaskStatusResponse(
        task_id=task_id,
        status="success",
        images=[{"url": "https://cdn.xxx/generated.png"}],
    )
```

---

### 8.5 Provider 工厂模式封装

> 来源：`backend/app/providers/`（完整 OOP 封装）

**抽象基类**:

```python
# base.py
from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseImageProvider(ABC):
    """图片生成 Provider 基类"""

    def __init__(self, api_key: str, config: Dict[str, Any] = None):
        self.api_key = api_key
        self.config = config or {}

    @abstractmethod
    async def generate_image(self, params: Dict[str, Any]) -> str:
        """提交图片生成任务，返回 task_id"""
        pass

    @abstractmethod
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询任务状态
        返回:
            {
                "task_id": str,
                "status": "pending" | "success" | "failed",
                "images": List[str],
                "error": str
            }
        """
        pass

    def get_config(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)
```

**Wuyinkeji Provider 实现**:

```python
# wuyinkeji.py
import httpx
from typing import Dict, Any, List
from .base import BaseImageProvider


class WuyinkejiProvider(BaseImageProvider):
    """Wuyinkeji 图片生成 Provider（支持 GPT-Image-2 + NanoBanana2）"""

    # 模型 → 端点映射
    ENDPOINT_MAP = {
        "nano-banana2":     "/api/async/image_nanoBanana2",
        "nano-banana-pro":  "/api/async/image_nanoBanana2",
        "gpt-image-2":      "/api/async/image_gpt",
    }

    def __init__(self, api_key: str, config: Dict[str, Any] = None):
        super().__init__(api_key, config)
        self.base_url = self.get_config("base_url", "https://api.wuyinkeji.com")
        self.timeout = self.get_config("timeout", 60)

    async def generate_image(self, params: Dict[str, Any]) -> str:
        """提交图片生成任务"""
        model_type = params.get("model_type", "nano-banana2")
        prompt = params.get("prompt", "")
        size = params.get("size", "1K")
        urls = params.get("urls", [])

        endpoint = self.ENDPOINT_MAP.get(model_type, "/api/async/image_nanoBanana2")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            if model_type == "gpt-image-2":
                # GPT-Image-2: JSON body
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers={"Content-Type": "application/json"},
                    json={"key": self.api_key, "prompt": prompt, "size": size},
                )
            else:
                # NanoBanana2: form-encoded + query param
                import json as json_mod
                form_data = {"prompt": prompt, "size": size}
                if urls:
                    form_data["urls"] = json_mod.dumps(urls)

                response = await client.post(
                    f"{self.base_url}{endpoint}?key={self.api_key}",
                    data=form_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )

            response.raise_for_status()
            result = response.json()

            if result.get("code") != 200:
                raise Exception(result.get("msg", "Unknown error"))

            return result.get("data", {}).get("id", "")

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """查询任务状态"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/api/async/detail",
                params={"key": self.api_key, "id": task_id},
            )
            response.raise_for_status()
            result = response.json()

            if result.get("code") != 200:
                return {"task_id": task_id, "status": "failed",
                        "error": result.get("msg", "Unknown error")}

            data = result.get("data", {})
            status = data.get("status", 0)

            # status: 0=处理中, 2=成功, 其他=失败
            if status == 0:
                return {"task_id": task_id, "status": "pending", "images": []}
            elif status == 2:
                result_data = data.get("result", {})
                images = self._parse_images(result_data)
                return {"task_id": task_id, "status": "success", "images": images}
            else:
                return {"task_id": task_id, "status": "failed",
                        "error": str(data.get("result", "")), "images": []}

    @staticmethod
    def _parse_images(result_data) -> List[dict]:
        """解析 result 字段为统一的 images 列表"""
        images = []
        if isinstance(result_data, str):
            images.append({"url": result_data})
        elif isinstance(result_data, list):
            for item in result_data:
                if isinstance(item, str):
                    images.append({"url": item})
                elif isinstance(item, dict):
                    images.append(item)
        elif isinstance(result_data, dict):
            images.append(result_data)
        return images
```

**工厂注册**:

```python
# __init__.py
from typing import Dict, Any
from .base import BaseImageProvider
from .wuyinkeji import WuyinkejiProvider

class ProviderFactory:
    _providers = {
        "wuyinkeji": WuyinkejiProvider,
    }

    @classmethod
    def create(cls, provider_type: str, api_key: str,
               config: Dict[str, Any] = None) -> BaseImageProvider:
        provider_class = cls._providers.get(provider_type.lower())
        if not provider_class:
            raise ValueError(f"Unknown provider type: {provider_type}")
        return provider_class(api_key, config)

    @classmethod
    def register(cls, provider_type: str, provider_class: type):
        """注册新 Provider（插件式扩展）"""
        cls._providers[provider_type.lower()] = provider_class
```

**使用方式**:

```python
# 创建 Provider
provider = ProviderFactory.create("wuyinkeji", "YOUR_API_KEY")

# 提交任务
task_id = await provider.generate_image({
    "model_type": "gpt-image-2",
    "prompt": "Cinematic landscape, golden hour",
    "size": "1K",
})

# 轮询结果
import asyncio
while True:
    status = await provider.get_task_status(task_id)
    if status["status"] == "success":
        print(f"图片 URL: {status['images'][0]['url']}")
        break
    elif status["status"] == "failed":
        print(f"失败: {status['error']}")
        break
    await asyncio.sleep(3)
```

---

## 9. 架构设计模式

### 9.1 异步提交 + 轮询模式

适用于 wuyinkeji 这类**异步 API**（提交后不立即返回结果）：

```
Client                    Backend                    wuyinkeji API
  │                          │                           │
  ├── POST /generate ──────→ │                           │
  │                          ├── POST /image_gpt ──────→ │
  │                          │ ←── { id: "xxx" } ────── │
  │ ←── { task_id: "xxx" } ──│                           │
  │                          │                           │
  │   (前端轮询或 WebSocket)  │                           │
  ├── GET /task/{id} ──────→ │                           │
  │                          ├── GET /detail?id=xxx ──→ │
  │                          │ ←── { status: 0 } ────── │
  │ ←── { status: pending } ─│                           │
  │                          │                           │
  ├── GET /task/{id} ──────→ │                           │
  │                          ├── GET /detail?id=xxx ──→ │
  │                          │ ←── { status: 2, url } ──│
  │ ←── { status: success } ─│                           │
```

### 9.2 多 Provider 路由模式

通过 `model_type` 字段路由到不同 Provider/端点：

```python
# 同一个 Provider 类支持多模型
ENDPOINT_MAP = {
    "gpt-image-2":     "/api/async/image_gpt",        # JSON body
    "nano-banana2":    "/api/async/image_nanoBanana2", # form-data
    "nano-banana-pro": "/api/async/image_nanoBanana2", # form-data
}
```

### 9.3 API Key 映射模式（前后端分离）

```
前端 (X-API-Key header)     后端 (DB 映射)           wuyinkeji
     │                         │                        │
     │ frontend_key="abc"      │                        │
     ├────────────────────────→│                        │
     │                         │ 查 DB: abc → backend_key│
     │                         │ backend_key="real_xxx"  │
     │                         ├───────────────────────→│
```

好处：前端不暴露真实 API Key，后端可随时更换。

### 9.4 批量并发生成模式

```python
import asyncio

async def batch_generate(prompts: list[str]) -> list[bool]:
    """并发批量生成（推荐 asyncio.gather）"""
    tasks = [
        generate_gpt_image(prompt, Path(f"output_{i}.png"))
        for i, prompt in enumerate(prompts)
    ]
    results = await asyncio.gather(*tasks)
    print(f"成功 {sum(results)}/{len(prompts)} 张")
    return results
```

---

## 10. 最佳实践

### API Key 安全

```python
# ✅ 推荐：从环境变量读取
import os
API_KEY = os.environ.get("WUYINKEJI_API_KEY", "")
if not API_KEY:
    raise RuntimeError("请设置环境变量 WUYINKEJI_API_KEY")

# ❌ 禁止：硬编码在代码中
API_KEY = "eLGzPZw0935TCJm0fn890TsvAN"  # 不要这样做！
```

### Prompt 构建（模板化）

> 来源：`backend/app/services/skills/gpt_image_2/prompt_builder.py`

```python
import re

class PromptBuilder:
    """从模板构建结构化提示词"""

    def build(self, template: str, form_data: dict) -> str:
        prompt = template
        for key, value in form_data.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        # 清理未填充的占位符
        prompt = re.sub(r'\{[^}]+\}', '', prompt)
        prompt = re.sub(r'\s+', ' ', prompt).strip()
        return prompt

# 示例
template = "Cinematic realistic animation, {scene}, {lighting}, {mood}, no real people"
prompt = PromptBuilder().build(template, {
    "scene": "1940s Chinese port",
    "lighting": "warm golden light",
    "mood": "nostalgic",
})
# → "Cinematic realistic animation, 1940s Chinese port, warm golden light, nostalgic, no real people"
```

### 进度回调（Skills Worker 模式）

```python
async def generate_with_progress(prompt, output, on_progress=None):
    """带进度回调的生成"""
    if on_progress:
        on_progress(10, "submitting")  # 提交中

    task_id = await submit_task(prompt)

    if on_progress:
        on_progress(30, "generating")  # 生成中

    for i in range(40):
        await asyncio.sleep(3)
        status = await get_status(task_id)
        if status["status"] == "success":
            if on_progress:
                on_progress(90, "downloading")
            await download(status["url"], output)
            on_progress(100, "completed")
            return True
        if on_progress:
            progress = min(85, 30 + i * 2)
            on_progress(progress, "generating")

    return False
```

### 完整流程检查清单

- [ ] API Key 从环境变量读取，不硬编码
- [ ] 提交失败有重试机制（max_retries ≥ 2）
- [ ] 轮询有超时保护（建议 120s）
- [ ] result 字段做了类型判断（str / list / dict）
- [ ] 图片下载有独立超时（建议 60s）
- [ ] 批量生成使用 asyncio.gather 并发
- [ ] 错误日志包含 task_id 便于排查
- [ ] 生成后图片做了尺寸校验/resize

---

## 附录：项目中的源文件索引

| 文件 | 作用 | 语言 |
|------|------|------|
| `scripts/ahma_love_letter.py` | 完整视频管线（含 GPT-Image-2 并发生成 + 重试） | Python |
| `scripts/test-image-api.py` | API 调用链路测试脚本 | Python |
| `backend/app/providers/base.py` | Provider 抽象基类 | Python |
| `backend/app/providers/wuyinkeji.py` | Wuyinkeji Provider 完整实现 | Python |
| `backend/app/providers/__init__.py` | ProviderFactory 工厂模式 | Python |
| `backend/app/api/v2/image.py` | FastAPI 图片生成路由 | Python |
| `backend/app/services/skills/gpt_image_2/generate.py` | Skills 图片生成器 | Python |
| `backend/app/services/skills/gpt_image_2/prompt_builder.py` | 提示词构建器 | Python |

---

*文档生成: 2026-08-11 | 来源: NanoAiCanvas 项目代码提取 | 生成者: BB小子 🤙*
