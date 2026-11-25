from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import inspect, select

from app.auth.security import verify_password
from app.config import settings
from app.db.models import KnowledgePoint, Subject, User, UserProfile
from app.db.seed import seed_initial_data


EXPECTED_TABLES = {
    "user",
    "exam_goal",
    "user_profile",
    "subject",
    "knowledge_point",
    "study_plan",
    "study_task",
    "study_record",
    "study_feedback",
    "knowledge_mastery",
    "agent_execution",
    "agent_memory",
    "knowledge_document",
    "wrong_question",
    "chat_message",
}


def test_health_endpoint_reports_connected(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_all_15_tables_and_idempotent_seed(test_db):
    session_factory = test_db
    with session_factory() as db:
        inspector = inspect(db.bind)
        tables = set(inspector.get_table_names())
        assert EXPECTED_TABLES.issubset(tables)

        subjects_before = db.scalars(select(Subject)).all()
        points_before = db.scalars(select(KnowledgePoint)).all()
        assert len(subjects_before) >= 7
        assert len(points_before) >= 30

        # Calling seed_initial_data again must not duplicate rows
        seed_initial_data(db)
        subjects_after = db.scalars(select(Subject)).all()
        points_after = db.scalars(select(KnowledgePoint)).all()
        assert len(subjects_after) == len(subjects_before)
        assert len(points_after) == len(points_before)


def test_register_hashes_password_and_creates_profile(client, test_db):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "Alice@University.EDU",
            "password": "secret123",
            "nickname": "爱丽丝",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["email"] == "alice@university.edu"
    assert data["user"]["nickname"] == "爱丽丝"
    assert "password" not in data["user"]

    with test_db() as db:
        user = db.scalar(select(User).where(User.email == "alice@university.edu"))
        assert user is not None
        assert user.password != "secret123"
        assert verify_password("secret123", user.password)

        profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
        assert profile is not None
        assert profile.profile_status == "UNFILLED"


def test_register_duplicate_email_returns_400(client):
    payload = {"email": "dup@example.com", "password": "password123"}
    first = client.post("/api/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/auth/register", json=payload)
    assert second.status_code == 400
    assert "已" in second.json()["detail"]


def test_login_by_email_and_username_and_wrong_password(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "kaoyan2027@example.com",
            "username": "kaoyan_hero",
            "password": "mypassword",
        },
    )
    assert reg.status_code == 201

    # Login by email
    res_email = client.post(
        "/api/auth/login",
        json={"account": "KAOYAN2027@example.com", "password": "mypassword"},
    )
    assert res_email.status_code == 200
    assert res_email.json()["user"]["username"] == "kaoyan_hero"

    # Login by username
    res_username = client.post(
        "/api/auth/login",
        json={"account": "kaoyan_hero", "password": "mypassword", "remember": False},
    )
    assert res_username.status_code == 200
    assert res_username.json()["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # Wrong password -> 401
    res_bad = client.post(
        "/api/auth/login",
        json={"account": "kaoyan_hero", "password": "wrong-password"},
    )
    assert res_bad.status_code == 401


def test_me_endpoint_validates_token(client, auth_headers):
    # Valid token
    ok_res = client.get("/api/auth/me", headers=auth_headers)
    assert ok_res.status_code == 200
    assert ok_res.json()["email"] == "tester@kaoyan.edu.cn"

    # Missing token -> 401
    no_auth = client.get("/api/auth/me")
    assert no_auth.status_code == 401

    # Invalid token -> 401
    bad_auth = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert bad_auth.status_code == 401

    # Expired token -> 401
    expired_payload = {
        "sub": "1",
        "username": "tester",
        "exp": int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp()),
    }
    expired_token = jwt.encode(
        expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    exp_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert exp_res.status_code == 401


def test_protected_business_endpoints_require_auth(client):
    endpoints = [
        ("/api/ai-test", None),
        (
            "/api/planner",
            {
                "subject_name": "Math",
                "exam_date": "2027-12-20",
                "weak_topics": ["Calculus"],
                "daily_hours": 3.0,
                "current_level": "Intermediate",
            },
        ),
        (
            "/api/exam-prep",
            {
                "topic": "Linear Algebra",
                "exam_format": "All",
                "number_of_questions": 3,
                "difficulty": "Intermediate",
            },
        ),
        (
            "/api/career",
            {
                "interests": ["AI"],
                "target_career": "AI Engineer",
                "current_skills": ["Python"],
                "academic_level": "University",
            },
        ),
        (
            "/api/projects",
            {
                "domain": "AI",
                "difficulty": "Intermediate",
                "tech_stack": ["Python"],
                "project_scope": "Individual",
            },
        ),
        ("/api/chat", {"message": "你好", "history": []}),
    ]
    for path, body in endpoints:
        res = client.post(path, json=body)
        assert res.status_code == 401, f"Expected 401 for unauthenticated {path}, got {res.status_code}"


def test_cors_whitelist_allows_configured_origin_and_blocks_unknown(client):
    allowed_origin = settings.CORS_ORIGINS[0]
    ok_res = client.options(
        "/api/health",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert ok_res.headers.get("access-control-allow-origin") == allowed_origin

    blocked_res = client.options(
        "/api/health",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert blocked_res.headers.get("access-control-allow-origin") is None
