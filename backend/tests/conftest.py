import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def isolated_ai_settings(monkeypatch):
    """Keep tests offline: no real API key, demo fallback enabled."""
    monkeypatch.setattr(settings, "AI_API_KEY", "")
    monkeypatch.setattr(settings, "ALLOW_DEMO_FALLBACK", True)
