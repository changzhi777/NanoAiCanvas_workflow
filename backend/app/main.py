from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from starlette.routing import Route
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api import (
    auth, assets, workflows, sync, points, points_admin,
    prompt_restrictions, categories, teams, assets_export,
    admin_users
)
from app.api.v2 import image as v2_image
from app.api.v2 import skills as v2_skills
from app.api.websocket import websocket_routes
from app.services.skills_worker import WorkerManager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 NanoAI Backend starting up...")

    # 启动 Skills Worker
    worker_mgr = WorkerManager()
    await worker_mgr.start_all(["gpt_image_2"])
    print("✅ Skills Workers started")

    yield

    # Shutdown
    print("👋 Stopping Skills Workers...")
    await worker_mgr.stop_all()
    print("👋 NanoAI Backend shutting down...")


app = FastAPI(
    title="NanoAI Canvas API",
    description="Backend API for NanoAI Canvas - Workflow & Asset Management",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
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

# V2 Image generation routers (new unified routes)
app.include_router(v2_image.router)

# V2 Skills routers (AI skill-based image generation)
app.include_router(v2_skills.router)

# WebSocket routes for real-time task status
for route in websocket_routes:
    app.add_route(route.path, route.endpoint, methods=["GET"])


@app.get("/")
async def root():
    return {"message": "NanoAI Canvas API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
