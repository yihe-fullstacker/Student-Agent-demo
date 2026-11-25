import logging
import time
from pathlib import Path
from typing import Generator, Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Engine, Integer, create_engine, event, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# SQLite only auto-increments INTEGER PRIMARY KEY; MySQL uses BIGINT.
BigIntPK = Integer().with_variant(BigInteger, "mysql")

DB_RETRY_DELAYS = (0.1, 0.3, 0.5)
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Base(DeclarativeBase):
    """Base declarative class for all ORM models."""


def _resolve_database_url(database_url: str) -> str:
    """Resolve relative SQLite file paths against the backend directory."""
    if not database_url.startswith("sqlite:///"):
        return database_url

    raw_path = database_url[len("sqlite:///") :]
    if raw_path in ("", ":memory:") or raw_path.startswith("file:"):
        return database_url

    db_path = Path(raw_path)
    if not db_path.is_absolute():
        db_path = (BACKEND_DIR / db_path).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path.as_posix()}"


def create_db_engine(database_url: str) -> Engine:
    """Create a configured SQLAlchemy engine for SQLite or MySQL."""
    resolved_url = _resolve_database_url(database_url)
    if resolved_url.startswith("sqlite"):
        db_engine = create_engine(
            resolved_url,
            connect_args={"check_same_thread": False},
            future=True,
        )

        @event.listens_for(db_engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return db_engine

    return create_engine(
        resolved_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        future=True,
    )


engine = create_db_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session with 3x retry on connection failure."""
    db: Optional[Session] = None
    last_exc: Optional[Exception] = None

    for attempt, delay in enumerate(DB_RETRY_DELAYS, start=1):
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            break
        except OperationalError as exc:
            last_exc = exc
            if db is not None:
                db.close()
                db = None
            logger.warning("Database connection attempt %d/3 failed: %s", attempt, exc)
            if attempt < len(DB_RETRY_DELAYS):
                time.sleep(delay)
    else:
        logger.error("Database unavailable after retries: %s", last_exc)
        raise HTTPException(status_code=503, detail="数据服务暂时不可用")

    assert db is not None
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> tuple[bool, str]:
    """Check whether the database responds to a lightweight SELECT 1."""
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return True, "connected"
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return False, str(exc)


def init_db(bind_engine: Optional[Engine] = None) -> None:
    """Create tables if missing and seed initial kaoyan subjects/knowledge points."""
    target_engine = bind_engine or engine
    # Ensure all ORM models are registered on Base.metadata before create_all.
    import app.db.models  # noqa: F401
    from app.db.seed import seed_initial_data
    from app.rag.knowledge_base import knowledge_base

    Base.metadata.create_all(bind=target_engine)
    session_factory = (
        sessionmaker(autocommit=False, autoflush=False, bind=target_engine)
        if bind_engine is not None
        else SessionLocal
    )
    with session_factory() as db:
        seed_initial_data(db)
        knowledge_base.sync_metadata(db)
