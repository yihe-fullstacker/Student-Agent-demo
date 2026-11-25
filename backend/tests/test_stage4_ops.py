from datetime import date, timedelta
import sqlite3

from sqlalchemy import select

from app.config import settings
from app.db.models import AgentExecution, AgentMemory, KnowledgeMastery, StudyTask
from app.middleware import reset_rate_limiter
from app.services.scheduler import run_daily_overdue_scan, run_weekly_replan_preanalysis
from scripts.backup_db import backup_database


def test_request_logging_header_and_rate_limit(client, monkeypatch):
    res = client.get("/")
    assert res.status_code == 200
    assert "x-process-time-ms" in res.headers

    # Enable strict rate limit for verification
    reset_rate_limiter()
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_REQUESTS", 3)
    monkeypatch.setattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60)

    for _ in range(3):
        ok = client.get("/")
        assert ok.status_code == 200

    limited = client.get("/")
    assert limited.status_code == 429
    assert "操作过于频繁" in limited.json()["detail"]

    # /api/health must bypass rate limiter
    health = client.get("/api/health")
    assert health.status_code == 200


def test_system_metrics_aggregates_agent_executions(client, auth_headers):
    client.post(
        "/api/school/analyze",
        headers=auth_headers,
        json={
            "target_school": "清华大学",
            "target_major": "计算机科学与技术",
            "current_level": "Intermediate",
        },
    )
    client.post(
        "/api/chat",
        headers=auth_headers,
        json={"message": "数学一如何备考？", "history": []},
    )

    metrics = client.get("/api/system/metrics", headers=auth_headers)
    assert metrics.status_code == 200
    data = metrics.json()
    assert data["total_calls"] >= 2
    assert data["fallback_calls"] >= 2
    assert data["by_type"]["ANALYSIS"] >= 1
    assert data["by_type"]["CHAT"] >= 1


def test_scheduler_daily_overdue_and_weekly_preanalysis(client, auth_headers, test_db):
    future_exam = (date.today() + timedelta(days=30)).isoformat()
    client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "北京理工大学",
            "major": "软件工程",
            "exam_date": future_exam,
            "subjects": ["数学（一）"],
            "daily_minutes": 180,
            "learning_level": "Intermediate",
        },
    )
    client.post("/api/plan/generate", headers=auth_headers)

    subjects = client.get("/api/subjects", headers=auth_headers).json()
    kp_id = subjects[0]["knowledge_points"][0]["id"]

    with test_db() as db:
        tasks = db.scalars(select(StudyTask).where(StudyTask.status == "PENDING")).all()
        assert len(tasks) >= 3
        for t in tasks[:3]:
            t.scheduled_date = date.today() - timedelta(days=2)
        db.add(
            KnowledgeMastery(
                user_id=tasks[0].user_id,
                knowledge_point_id=kp_id,
                practice_count=5,
                correct_count=0,
                wrong_count=5,
                is_weak=True,
            )
        )
        db.commit()

        overdue_updated = run_daily_overdue_scan(db)
        assert overdue_updated >= 3

        flagged = run_weekly_replan_preanalysis(db)
        assert flagged == 1

        mem = db.scalar(
            select(AgentMemory).where(AgentMemory.key == "weekly_preanalysis")
        )
        assert mem is not None
        sched_exec = db.scalar(
            select(AgentExecution).where(AgentExecution.trigger_source == "SCHEDULED")
        )
        assert sched_exec is not None


def test_sqlite_backup_script_creates_valid_backup(tmp_path):
    src_db = tmp_path / "source.db"
    with sqlite3.connect(src_db) as conn:
        conn.execute("CREATE TABLE demo (id INTEGER PRIMARY KEY, name TEXT)")
        conn.execute("INSERT INTO demo (name) VALUES ('kaoyan')")
        conn.commit()

    backup_dir = tmp_path / "backups"
    out_file = backup_database(
        database_url=f"sqlite:///{src_db.as_posix()}",
        backup_dir=backup_dir,
        retention_days=30,
    )
    assert out_file.exists()
    with sqlite3.connect(out_file) as conn:
        row = conn.execute("SELECT name FROM demo").fetchone()
        assert row == ("kaoyan",)
