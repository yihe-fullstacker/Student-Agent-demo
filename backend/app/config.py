import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    ENV: str = os.getenv("ENV", "development")

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
