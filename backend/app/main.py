from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api import auth, assets, workflows, sync, points, points_admin, prompt_restrictions, categories, teams, assets_export
from app.routers import nanobanana2, gpt_image_2

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 NanoAI Backend starting up...")
    yield
    # Shutdown
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

# Image generation routers (v2)
app.include_router(nanobanana2.router)
app.include_router(gpt_image_2.router)


@app.get("/")
async def root():
    return {"message": "NanoAI Canvas API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)