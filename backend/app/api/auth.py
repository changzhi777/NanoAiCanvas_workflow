from fastapi import APIRouter, Depends, HTTPException, status, Body, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, TokenResponse, UserResponse, UserUpdate
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.redis import SessionManager

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    """Get current user from JWT token (stateless validation)"""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_current_user_optional(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Optional[User]:
    """Optional user validation - returns None if not authenticated instead of raising error"""
    if not token:
        return None

    try:
        payload = decode_token(token)
        if payload is None:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user
    except Exception:
        return None


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user
    user = User(
        username=data.username,
        email=data.email,
        password_hash=get_password_hash(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create Redis session (default 7 days for registration)
    session_id = await SessionManager.create_session(str(user.id), remember=False)

    # Generate tokens
    access_token = create_access_token({
        "sub": str(user.id),
        "session_id": session_id,
    })
    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "session_id": session_id,
    })

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        remember_me=False,
    )


class LoginRequest(BaseModel):
    username: str  # email
    password: str
    remember_me: bool = False

    @classmethod
    def as_form(cls, username: str = Form(...), password: str = Form(...), remember_me: str = Form("false")):
        return cls(
            username=username,
            password=password,
            remember_me=remember_me.lower() == "true"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest = Depends(LoginRequest.as_form),
    db: AsyncSession = Depends(get_db)
):
    """Login with email/password and optional remember_me flag"""
    # Find user by email
    result = await db.execute(select(User).where(User.email == login_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last login
    user.last_login_at = datetime.utcnow()
    await db.commit()

    # Create Redis session
    session_id = await SessionManager.create_session(str(user.id), remember=login_data.remember_me)

    # Generate tokens with session_id embedded
    access_token = create_access_token({
        "sub": str(user.id),
        "session_id": session_id,
    })
    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "session_id": session_id,
    })

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        remember_me=login_data.remember_me,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    session_id = payload.get("session_id")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Validate session in Redis
    if session_id:
        session_data = await SessionManager.get_session(session_id)
        remember_me = session_data.get("remember", False) if session_data else False
        # Refresh session TTL
        await SessionManager.refresh_session(session_id, remember=remember_me)
    else:
        remember_me = False

    new_access_token = create_access_token({
        "sub": str(user.id),
        "session_id": session_id,
    })
    new_refresh_token = create_refresh_token({
        "sub": str(user.id),
        "session_id": session_id,
    })

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        remember_me=remember_me,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )


@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.username is not None and data.username != current_user.username:
        # Check if username exists
        result = await db.execute(select(User).where(User.username == data.username, User.id != current_user.id))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = data.username

    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )