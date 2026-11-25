import asyncio
import httpx
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import database
from app.db.database import get_db, init_db
from app.main import app
from app.middleware import reset_rate_limiter


class SyncASGIClient:
    """Synchronous wrapper over httpx.ASGITransport to avoid Windows sandbox socketpair hangs."""

    def __init__(self, asgi_app, base_url: str = "http://testserver"):
        self.asgi_app = asgi_app
        self.base_url = base_url

    def request(self, method: str, url: str, **kwargs) -> httpx.Response:
        async def _call() -> httpx.Response:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=self.asgi_app),
                base_url=self.base_url,
            ) as async_client:
                return await async_client.request(method, url, **kwargs)

        return asyncio.run(_call())

    def get(self, url: str, **kwargs) -> httpx.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> httpx.Response:
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs) -> httpx.Response:
        return self.request("PUT", url, **kwargs)

    def delete(self, url: str, **kwargs) -> httpx.Response:
        return self.request("DELETE", url, **kwargs)

    def options(self, url: str, **kwargs) -> httpx.Response:
        return self.request("OPTIONS", url, **kwargs)


@pytest.fixture(autouse=True)
def isolated_ai_settings(monkeypatch):
    """Keep tests offline: no real API key, demo fallback enabled, rate limit & scheduler off."""
    monkeypatch.setattr(settings, "AI_API_KEY", "")
    monkeypatch.setattr(settings, "ALLOW_DEMO_FALLBACK", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", False)
    monkeypatch.setattr(settings, "ENABLE_SCHEDULER", False)
    reset_rate_limiter()


@pytest.fixture()
def test_db(monkeypatch):
    """Create a fresh isolated in-memory SQLite database per test."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(test_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    testing_session_local = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    monkeypatch.setattr(database, "engine", test_engine)
    monkeypatch.setattr(database, "SessionLocal", testing_session_local)

    init_db(bind_engine=test_engine)

    def _override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield testing_session_local
    finally:
        app.dependency_overrides.clear()
        test_engine.dispose()


@pytest.fixture()
def client(test_db):
    """Return an isolated ASGI test client."""
    return SyncASGIClient(app)


@pytest.fixture()
def auth_headers(client):
    """Register a test user and return Authorization headers."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "tester@kaoyan.edu.cn",
            "password": "password123",
            "nickname": "测试考生",
        },
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
