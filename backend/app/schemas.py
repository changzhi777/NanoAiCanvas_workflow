from pydantic import BaseModel, EmailStr
from uuid import UUID


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    remember_me: bool = False
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    is_verified: bool
    created_at: str
    api_key: str | None = None  # 用户的专属 API Key


class UserUpdate(BaseModel):
    username: str | None = None