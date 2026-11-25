import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_JWT_SECRET_KEY = "dev-secret-change-in-production-32bytes-key"


def _parse_cors_origins(raw: str) -> list[str]:
    origins = [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
    if "*" in origins:
        logger.warning("Wildcard '*' in CORS_ORIGINS is ignored when allow_credentials=True.")
        origins = [item for item in origins if item != "*"]
    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    ENV: str = os.getenv("ENV", "development")

    # Database settings (defaults to SQLite for local dev, switchable to MySQL 8.0)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/kaoyan_agent.db")

    # JWT authentication settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", DEFAULT_JWT_SECRET_KEY)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))
    )

    # CORS whitelist (never wildcard when allow_credentials=True)
    CORS_ORIGINS: list[str] = _parse_cors_origins(
        os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    )

    # Rate limiting & background scheduler
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "120"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    ENABLE_SCHEDULER: bool = os.getenv("ENABLE_SCHEDULER", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    # Domestic LLM provider settings (OpenAI-compatible API).
    # DEEPSEEK_* names are still supported so existing deployments keep working.
    AI_API_KEY: str = os.getenv("AI_API_KEY", "") or os.getenv("DEEPSEEK_API_KEY", "")
    AI_BASE_URL: str = (
        os.getenv("AI_BASE_URL", "")
        or os.getenv("DEEPSEEK_BASE_URL", "")
        or "https://api.deepseek.com/v1"
    )
    AI_MODEL: str = (
        os.getenv("AI_MODEL", "") or os.getenv("DEEPSEEK_MODEL", "") or "deepseek-chat"
    )

    # When enabled, agents silently return built-in demo data if the provider is
    # unavailable. Disabled by default so users always get real model output.
    ALLOW_DEMO_FALLBACK: bool = os.getenv("ALLOW_DEMO_FALLBACK", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


settings = Settings()
