import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    ENV: str = os.getenv("ENV", "development")
    
    # We allow GEMINI_API_KEY to be loaded from environment variables or passed dynamically in request headers
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    GOOGLE_CLOUD_PROJECT_NUMBER: str = os.getenv("GOOGLE_CLOUD_PROJECT_NUMBER", "")

settings = Settings()
