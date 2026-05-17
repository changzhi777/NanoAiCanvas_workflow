from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import get_settings
from app.api import (
    auth, assets, workflows, sync, points, points_admin,
    prompt_restrictions, categories, teams, assets_export,
    admin_users, notifications, tags, folders
)
from app.api import chat
from app.api.v2 import image as v2_image
from app.api.v2 import skills as v2_skills
from app.api.v2 import admin as v2_admin
from app.api.v2 import glm_proxy as v2_glm
from app.api.v2 import minimax as v2_minimax
from app.api.v2 import app_visibility as v2_app_visibility
from app.api.v2 import workflow_tasks as v2_workflow_tasks
from app.services.skills_worker import WorkerManager
from app.services.health_checker import run_health_check, mark_stale_keys

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 NanoAI Backend starting up...")
    worker_mgr = WorkerManager()
    await worker_mgr.start_all(["gpt_image_2"])
    print("✅ Skills Workers started")
    await chat.manager.start_subscriber()
    print("✅ Chat Redis subscriber started")

    import asyncio
    health_task = asyncio.create_task(run_health_check())
    stale_task = asyncio.create_task(mark_stale_keys())
    print("✅ API Key health checker started")

    yield

    health_task.cancel()
    stale_task.cancel()
    await chat.manager.stop_subscriber()
    print("👋 Chat Redis subscriber stopped")
    print("👋 Stopping Skills Workers...")
    await worker_mgr.stop_all()
    print("👋 NanoAI Backend shutting down...")


app = FastAPI(
    title="NanoAI Canvas API",
    description="Backend API for NanoAi Canvas - Workflow & Asset Management",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(points.router, prefix="/api")
app.include_router(points_admin.router, prefix="/api")
app.include_router(prompt_restrictions.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(assets_export.router, prefix="/api")
app.include_router(admin_users.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(folders.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# V2 routers
app.include_router(v2_image.router)
app.include_router(v2_skills.router)
app.include_router(v2_admin.router)
app.include_router(v2_glm.router)
app.include_router(v2_minimax.router)
app.include_router(v2_app_visibility.router)
app.include_router(v2_workflow_tasks.router)
from app.api.v2 import generation_log as v2_genlog
app.include_router(v2_genlog.router)

from app.api.v2 import tvc_config as v2_tvc_config
app.include_router(v2_tvc_config.router)

from app.api.v2 import library as v2_library
app.include_router(v2_library.router)

from app.api.v2 import tvc_projects as v2_tvc_projects
app.include_router(v2_tvc_projects.router)


@app.websocket("/ws/tasks/{task_id}")
async def ws_task_status(websocket: WebSocket, task_id: str):
    from app.services.pubsub import TaskSubscriber
    await websocket.accept()
    subscriber = TaskSubscriber()
    subscriber_id = await subscriber.subscribe(task_id)
    try:
        await websocket.send_json({"type": "connected", "task_id": task_id, "message": "已连接到任务状态更新"})
        while True:
            message = await subscriber.get_message(timeout=30.0)
            if message:
                await websocket.send_json(message)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        subscriber.close()


# 静态文件：聊天上传文件
upload_dir = os.environ.get("CHAT_UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "chat-uploads"))
os.makedirs(upload_dir, exist_ok=True)
app.mount("/chat-uploads", StaticFiles(directory=upload_dir), name="chat-uploads")

# 静态文件：资产本地存储（下载的外部图片）
asset_upload_dir = os.environ.get(
    "ASSET_UPLOAD_DIR",
    os.path.join(upload_dir, "assets"),
)
os.makedirs(asset_upload_dir, exist_ok=True)
app.mount("/asset-uploads", StaticFiles(directory=asset_upload_dir), name="asset-uploads")


@app.get("/")
async def root():
    return {"message": "NanoAI Canvas API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
