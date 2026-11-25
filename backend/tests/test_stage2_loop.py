from datetime import date, timedelta

from sqlalchemy import select

from app.db.models import AgentExecution, StudyPlan, StudyRecord, StudyTask


def _register_and_headers(client, email: str):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "nickname": email.split("@")[0]},
    )
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_subjects_and_default_profile(client, auth_headers):
    subj_res = client.get("/api/subjects", headers=auth_headers)
    assert subj_res.status_code == 200
    subjects = subj_res.json()
    assert len(subjects) >= 7
    assert any(s["code"] == "cs408" and len(s["knowledge_points"]) >= 4 for s in subjects)

    prof_res = client.get("/api/profile", headers=auth_headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["profile_status"] == "UNFILLED"
    assert prof["subjects"] == []


def test_profile_validation_and_save(client, auth_headers):
    bad_minutes = client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "清华大学",
            "major": "计算机科学与技术",
            "subjects": ["数学（一）"],
            "daily_minutes": 0,
            "learning_level": "Intermediate",
        },
    )
    assert bad_minutes.status_code == 422

    bad_level = client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "清华大学",
            "major": "计算机科学与技术",
            "subjects": ["数学（一）"],
            "daily_minutes": 180,
            "learning_level": "Expert",
        },
    )
    assert bad_level.status_code == 422

    future_exam = (date.today() + timedelta(days=150)).isoformat()
    ok_res = client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "浙江大学",
            "major": "计算机技术",
            "exam_date": future_exam,
            "target_score": 390,
            "subjects": ["思想政治理论", "英语（一）", "数学（一）", "计算机学科专业基础（408）"],
            "daily_minutes": 240,
            "learning_level": "Intermediate",
            "weakness": "多元微积分，操作系统虚拟内存",
        },
    )
    assert ok_res.status_code == 200
    data = ok_res.json()
    assert data["school"] == "浙江大学"
    assert data["profile_status"] == "PENDING_PLAN"
    assert len(data["subjects"]) == 4


def test_generate_plan_requires_profile_then_persists_hierarchy_and_versions(client, auth_headers, test_db):
    # Unfilled profile -> 400
    fail_res = client.post("/api/plan/generate", headers=auth_headers)
    assert fail_res.status_code == 400

    # Fill profile
    future_exam = (date.today() + timedelta(days=200)).isoformat()
    client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "复旦大学",
            "major": "电子信息",
            "exam_date": future_exam,
            "target_score": 380,
            "subjects": ["数学（一）", "计算机学科专业基础（408）"],
            "daily_minutes": 200,
            "learning_level": "Beginner",
            "weakness": "线性代数二次型",
        },
    )

    gen1 = client.post("/api/plan/generate", headers=auth_headers)
    assert gen1.status_code == 200
    plan1 = gen1.json()["plan"]
    assert plan1["version"] == 1
    assert plan1["source"] == "fallback"
    assert len(plan1["phases"]) == 3
    assert len(plan1["weeks"]) == 16  # capped at 16 weeks per 3.2.4

    # Profile status updated to PLAN_GENERATED
    prof = client.get("/api/profile", headers=auth_headers).json()
    assert prof["profile_status"] == "PLAN_GENERATED"

    # Verify DB rows: YEAR + PHASE + WEEK, StudyTask, AgentExecution
    with test_db() as db:
        plans = db.scalars(select(StudyPlan)).all()
        assert any(p.plan_type == "YEAR" and p.status == "ACTIVE" for p in plans)
        assert any(p.plan_type == "PHASE" for p in plans)
        assert len([p for p in plans if p.plan_type == "WEEK"]) == 16
        tasks = db.scalars(select(StudyTask)).all()
        assert len(tasks) >= 16
        execs = db.scalars(select(AgentExecution)).all()
        assert len(execs) == 1
        assert execs[0].execution_type == "INITIAL_PLAN"

    # Generate v2 -> archives v1
    gen2 = client.post("/api/plan/generate", headers=auth_headers)
    assert gen2.status_code == 200
    plan2 = gen2.json()["plan"]
    assert plan2["version"] == 2

    versions = client.get("/api/plan/versions", headers=auth_headers).json()["versions"]
    assert len(versions) == 2
    assert versions[0]["version"] == 2 and versions[0]["status"] == "ACTIVE"
    assert versions[1]["version"] == 1 and versions[1]["status"] == "ARCHIVED"


def test_today_tasks_overdue_checkin_feedback_stats_and_isolation(client, auth_headers, test_db):
    future_exam = (date.today() + timedelta(days=30)).isoformat()
    client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "南京大学",
            "major": "软件工程",
            "exam_date": future_exam,
            "subjects": ["数学（二）", "英语（二）"],
            "daily_minutes": 180,
            "learning_level": "Intermediate",
            "weakness": "中值定理",
        },
    )
    client.post("/api/plan/generate", headers=auth_headers)

    today_res = client.get("/api/task/today", headers=auth_headers)
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert len(today_data["task_list"]) >= 1
    first_task = today_data["task_list"][0]

    # Start task -> IN_PROGRESS
    start_res = client.post(f"/api/task/{first_task['id']}/start", headers=auth_headers)
    assert start_res.status_code == 200
    assert start_res.json()["task"]["status"] == "IN_PROGRESS"

    # Cross-user access must return 404
    other_headers = _register_and_headers(client, "other@kaoyan.edu.cn")
    cross_res = client.post(f"/api/task/{first_task['id']}/complete", headers=other_headers)
    assert cross_res.status_code == 404

    # Complete task with feedback -> COMPLETED + StudyRecord + StudyFeedback
    comp_res = client.post(
        f"/api/task/{first_task['id']}/complete",
        headers=auth_headers,
        json={
            "actual_minutes": 95,
            "self_rating": 5,
            "difficulty_feeling": "EASY",
            "note": "中值定理例题全对",
        },
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["task"]["status"] == "COMPLETED"
    record_id = comp_res.json()["record_id"]

    # Update feedback via /api/record/feedback
    fb_res = client.post(
        "/api/record/feedback",
        headers=auth_headers,
        json={
            "record_id": record_id,
            "self_rating": 4,
            "difficulty_feeling": "MODERATE",
            "note": "补充复盘：罗尔定理构造辅助函数",
        },
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["feedback"]["self_rating"] == 4

    # Simulate an older scheduled task becoming OVERDUE automatically
    with test_db() as db:
        pending_task = db.scalar(
            select(StudyTask).where(StudyTask.status == "PENDING")
        )
        assert pending_task is not None
        pending_task.scheduled_date = date.today() - timedelta(days=3)
        db.commit()

    refreshed_today = client.get("/api/task/today", headers=auth_headers).json()
    assert len(refreshed_today["overdue_tasks"]) >= 1
    assert refreshed_today["overdue_tasks"][0]["status"] == "OVERDUE"

    # Record list & stats verification
    rec_list = client.get("/api/record/list", headers=auth_headers).json()["records"]
    assert len(rec_list) == 1
    assert rec_list[0]["actual_minutes"] == 95
    assert rec_list[0]["feedback"]["self_rating"] == 4

    stats = client.get("/api/record/stats", headers=auth_headers).json()
    assert stats["total_study_minutes"] == 95
    assert stats["today_study_minutes"] == 95
    assert stats["completed_tasks_count"] == 1
    assert stats["overdue_tasks_count"] >= 1
    assert stats["behind_days"] >= 3.0
    assert stats["needs_replan_warning"] is True
    assert len(stats["weekly_trend"]) == 4
    assert stats["exam_countdown"]["school"] == "南京大学"
    with test_db() as db:
        assert db.scalar(select(StudyRecord)) is not None
