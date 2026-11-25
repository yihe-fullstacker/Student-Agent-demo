from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

from app.config import settings


@dataclass(frozen=True)
class AIConnection:
    """Provider settings for one request (headers override .env defaults)."""

    api_key: str
    base_url: str
    model: str


def get_ai_connection(
    x_ai_api_key: Optional[str] = Header(None),
    x_ai_base_url: Optional[str] = Header(None),
    x_ai_model: Optional[str] = Header(None),
) -> AIConnection:
    """
    Resolve the domestic LLM provider configuration.

    The browser sends the values configured on the Settings page through
    X-AI-Api-Key / X-AI-Base-Url / X-AI-Model; anything missing falls back to .env.
    """
    base_url = (x_ai_base_url or settings.AI_BASE_URL or "").strip().rstrip("/")
    if not base_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail=f"AI 接口地址无效：{base_url or '空'}，必须以 http:// 或 https:// 开头。",
        )

    api_key = (x_ai_api_key or settings.AI_API_KEY or "").strip()
    model = (x_ai_model or settings.AI_MODEL or "").strip()
    if not model:
        raise HTTPException(status_code=400, detail="AI 模型名称不能为空。")

    return AIConnection(api_key=api_key, base_url=base_url, model=model)
