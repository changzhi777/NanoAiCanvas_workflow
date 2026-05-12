from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # OpenAI API
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    # Skills Service
    SKILLS_API_KEY: str = ""  # Optional API key for LLM-based template recommendation

    # 速创 API (Wuyinkeji — NanoBanana2 / GPT-Image-2)
    WUYINKEJI_API_KEY: str = ""
    WUYINKEJI_API_BASE_URL: str = "https://api.wuyinkeji.com"

    # GLM (智谱AI)
    GLM_API_KEY: str = ""
    GLM_API_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4"

    # 即梦 (字节AI)
    JIMENG_API_KEY: str = ""
    JIMENG_API_BASE_URL: str = "https://api.jimeng.jike.com/v1"

    # Volcengine Ark (Seedance 视频生成)
    ARK_API_KEY: str = ""
    ARK_API_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"

    # MiniMax
    MINIMAX_API_KEY: str = ""
    MINIMAX_API_BASE_URL: str = "https://api.minimaxi.com/v1"

    # SMTP (optional - password reset emails)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@nanoai.fun"

    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Allowed email domains for registration
    ALLOWED_EMAIL_DOMAINS: list[str] = ["caohua.com", "nanoai.fun", "qq.com"]

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def REDIS_URL(self) -> str:
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()