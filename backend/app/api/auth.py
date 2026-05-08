from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models import User
from app.models.user import UserStatus
from app.schemas import UserRegister, UserLogin, TokenResponse, UserResponse, UserUpdate
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.redis import SessionManager, redis_client

# Login rate limiting constants
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 900  # 15 minutes
LOGIN_ATTEMPT_PREFIX = "login_attempts:"

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ALLOWED_EMAIL_DOMAINS = {"caohua.com", "nanoai.fun", "qq.com"}


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


@router.post("/register")
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Validate email domain
    email_domain = data.email.split("@")[-1].lower()
    if email_domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Email domain not allowed. Allowed domains: {', '.join(sorted(ALLOWED_EMAIL_DOMAINS))}",
        )

    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user with pending status (requires admin approval)
    user = User(
        username=data.username,
        email=data.email,
        password_hash=get_password_hash(data.password),
        status=UserStatus.PENDING,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"message": "Registration submitted. Please wait for admin approval.", "status": "pending"}


class LoginRequest(BaseModel):
    username: str  # email
    password: str
    remember_me: bool = False


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login with email/password and optional remember_me flag"""
    # Rate limiting check (graceful degradation if Redis unavailable)
    rate_key = f"{LOGIN_ATTEMPT_PREFIX}{login_data.username}"
    redis_available = True
    try:
        attempts = await redis_client.get(rate_key)
        if attempts and int(attempts) >= LOGIN_MAX_ATTEMPTS:
            ttl = await redis_client.ttl(rate_key)
            raise HTTPException(
                status_code=429,
                detail=f"Too many login attempts. Try again in {ttl // 60 + 1} minutes.",
                headers={"Retry-After": str(ttl)},
            )
    except HTTPException:
        raise
    except Exception:
        redis_available = False

    # Find user by email
    result = await db.execute(select(User).where(User.email == login_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.password_hash):
        # Increment failed attempts
        try:
            pipe = redis_client.pipeline()
            pipe.incr(rate_key)
            pipe.expire(rate_key, LOGIN_LOCKOUT_SECONDS)
            await pipe.execute()
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check user status
    if user.status == UserStatus.PENDING:
        raise HTTPException(status_code=403, detail="Account pending approval. Please wait for admin review.")
    if user.status == UserStatus.REJECTED:
        raise HTTPException(status_code=403, detail="Registration rejected. Please contact support.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account has been disabled.")

    # Login success - clear rate limit
    if redis_available:
        try:
            await redis_client.delete(rate_key)
        except Exception:
            pass

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


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout - invalidate server-side session"""
    return {"message": "Logged out successfully"}


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request password reset - sends reset token to email"""
    import secrets
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent."}

    # Generate reset token (valid 1 hour)
    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    await db.commit()

    # Send email
    from app.services.email import send_password_reset_email
    await send_password_reset_email(user.email, reset_token)

    return {"message": "If the email exists, a reset link has been sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset password using reset token"""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    result = await db.execute(
        select(User).where(
            User.reset_token == data.token,
            User.reset_token_expires > datetime.utcnow(),
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Update password and clear reset token
    user.password_hash = get_password_hash(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()

    return {"message": "Password has been reset successfully."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # 查询用户绑定的 API Key
    api_key = None
    try:
        from app.models.api_key import ApiKeyConfig
        result = await db.execute(
            select(ApiKeyConfig).where(ApiKeyConfig.user_id == str(current_user.id))
        )
        api_key_config = result.scalar_one_or_none()
        if api_key_config:
            api_key = api_key_config.frontend_key
    except Exception:
        pass

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
        api_key=api_key,
        status=current_user.status,
        role=current_user.role,
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
        status=current_user.status,
        role=current_user.role,
    )