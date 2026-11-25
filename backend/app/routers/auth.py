import re
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.db.database import get_db
from app.db.models import User, UserProfile

router = APIRouter(prefix="/api/auth", tags=["Auth"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REMEMBER_EXPIRE_MINUTES = 60 * 24 * 7


class RegisterRequest(BaseModel):
    email: str = Field(..., description="用户邮箱")
    password: str = Field(..., min_length=6, max_length=128, description="登录密码（至少6位）")
    username: Optional[str] = Field(None, min_length=2, max_length=50, description="用户名")
    nickname: Optional[str] = Field(None, max_length=50, description="用户昵称")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_REGEX.match(normalized):
            raise ValueError("请输入有效的邮箱地址")
        return normalized

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if len(cleaned) < 2:
            raise ValueError("用户名长度不能少于 2 个字符")
        return cleaned

    @field_validator("nickname")
    @classmethod
    def normalize_nickname(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class LoginRequest(BaseModel):
    account: Optional[str] = Field(None, description="邮箱或用户名")
    email: Optional[str] = Field(None, description="邮箱（兼容字段）")
    password: str = Field(..., min_length=1, description="密码")
    remember: bool = Field(True, description="是否记住登录状态（7天）")

    @model_validator(mode="after")
    def ensure_account(self) -> "LoginRequest":
        candidate = (self.account or self.email or "").strip()
        if not candidate:
            raise ValueError("请输入邮箱或用户名")
        self.account = candidate
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    nickname: str
    created_at: datetime


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


def _build_unique_username(db: Session, email: str) -> str:
    prefix = re.sub(r"[^a-zA-Z0-9_.-]", "_", email.split("@")[0])[:36] or "student"
    if len(prefix) < 2:
        prefix = f"user_{prefix}"
    candidate = prefix
    while db.scalar(select(User.id).where(User.username == candidate)) is not None:
        candidate = f"{prefix[:36]}_{secrets.token_hex(2)}"
    return candidate


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account, create an initial UserProfile, and issue a JWT token."""
    existing_email = db.scalar(select(User).where(User.email == payload.email))
    if existing_email is not None:
        raise HTTPException(status_code=400, detail="该邮箱已被注册，请直接登录")

    if payload.username is not None:
        existing_username = db.scalar(select(User).where(User.username == payload.username))
        if existing_username is not None:
            raise HTTPException(status_code=400, detail="该用户名已被占用，请更换后重试")
        username = payload.username
    else:
        username = _build_unique_username(db, payload.email)

    nickname = payload.nickname or (payload.username or payload.email.split("@")[0])
    user = User(
        username=username,
        email=payload.email,
        password=hash_password(payload.password),
        nickname=nickname[:50],
    )
    db.add(user)
    db.flush()

    db.add(
        UserProfile(
            user_id=user.id,
            daily_minutes=180,
            learning_level="Intermediate",
            subjects_json="[]",
            weakness="",
            profile_status="UNFILLED",
        )
    )
    db.commit()
    db.refresh(user)

    token, expires_in = create_access_token(
        user_id=user.id,
        username=user.username,
        expires_minutes=REMEMBER_EXPIRE_MINUTES,
    )
    return AuthTokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate by email or username and return a signed JWT access token."""
    raw_account = (payload.account or "").strip()
    normalized_email = raw_account.lower()
    user = db.scalar(
        select(User).where(
            or_(User.email == normalized_email, User.username == raw_account)
        )
    )
    if user is None or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="账号或密码错误")

    expires_minutes = (
        REMEMBER_EXPIRE_MINUTES if payload.remember else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    token, expires_in = create_access_token(
        user_id=user.id,
        username=user.username,
        expires_minutes=expires_minutes,
    )
    return AuthTokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout(_current_user: User = Depends(get_current_user)):
    """Stateless JWT logout confirmation endpoint."""
    return {"ok": True, "message": "已退出登录"}
