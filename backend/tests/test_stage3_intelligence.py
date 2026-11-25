from datetime import date, timedelta

from sqlalchemy import select

from app.db.models import (
    AgentMemory,
    ChatMessageRecord,
    KnowledgeDocument,
    KnowledgeMastery,
    StudyPlan,
    StudyTask,
    WrongQuestion,
)


def test_exam_generate_submit_wrongbook_and_weak_threshold(client, auth_headers, test_db):
    subjects = client.get("/api/subjects", headers=auth_headers).json()
    cs408 = next(s for s in subjects if s["code"] == "cs408")
    kp = cs408["knowledge_points"][0]

    gen = client.post(
        "/api/exam/generate",
        headers=auth_headers,
        json={
            "subject_id": cs408["id"],
            "knowledge_point_id": kp["id"],
            "difficulty": "Intermediate",
            "count": 5,
        },
    )
    assert gen.status_code == 200
    quiz = gen.json()
    assert quiz["source"] == "fallback"
    assert len(quiz["questions"]) == 5

    # Submit 5 wrong answers (different stems) to hit WEAK_THRESHOLD=5
    answers = []
    for idx, q in enumerate(quiz["questions"]):
        wrong_idx = (q["correct_answer_index"] + 1) % 4
        answers.append(
            {
                "question": f"[{idx}] {q['question']}",
                "options": q["options"],
                "correct_answer_index": q["correct_answer_index"],
                "user_answer_index": wrong_idx,
                "explanation": q["explanation"],
            }
        )

    sub = client.post(
        "/api/exam/submit",
        headers=auth_headers,
        json={
            "subject_id": cs408["id"],
            "knowledge_point_id": kp["id"],
            "topic": quiz["topic"],
            "answers": answers,
        },
    )
    assert sub.status_code == 200
    sub_data = sub.json()
    assert sub_data["correct_count"] == 0
    assert sub_data["wrong_saved_count"] == 5
    assert sub_data["newly_marked_weak"] is True

    with test_db() as db:
        mastery = db.scalar(select(KnowledgeMastery))
        assert mastery is not None
        assert mastery.wrong_count == 5
        assert mastery.is_weak is True
        mem = db.scalar(select(AgentMemory).where(AgentMemory.memory_type == "WEAKNESS"))
        assert mem is not None

    # List wrong questions and retry one correctly
    wrong_list = client.get("/api/wrong/list", headers=auth_headers).json()["wrong_questions"]
    assert len(wrong_list) == 5

    first_wrong = wrong_list[0]
    retry_wrong = client.post(
        f"/api/wrong/{first_wrong['id']}/retry",
        headers=auth_headers,
        json={"user_answer_index": first_wrong["correct_answer_index"]},
    )
    assert retry_wrong.status_code == 200
    assert retry_wrong.json()["is_correct"] is True
    assert retry_wrong.json()["mastered"] is True

    remaining = client.get("/api/wrong/list", headers=auth_headers).json()["wrong_questions"]
    assert len(remaining) == 4
    with test_db() as db:
        assert len(db.scalars(select(WrongQuestion)).all()) == 5


def test_replan_and_version_comparison(client, auth_headers, test_db):
    # Replan without active plan -> 400
    no_plan = client.post("/api/replan", headers=auth_headers, json={"reason": "test"})
    assert no_plan.status_code == 400

    # Setup profile & initial plan
    future_exam = (date.today() + timedelta(days=45)).isoformat()
    client.put(
        "/api/profile",
        headers=auth_headers,
        json={
            "exam_year": 2027,
            "school": "北京航空航天大学",
            "major": "计算机科学与技术",
            "exam_date": future_exam,
            "subjects": ["数学（一）", "计算机学科专业基础（408）"],
            "daily_minutes": 240,
            "learning_level": "Intermediate",
            "weakness": "操作系统死锁",
        },
    )
    client.post("/api/plan/generate", headers=auth_headers)

    # Mark one task overdue & add a weak KnowledgeMastery row
    subjects = client.get("/api/subjects", headers=auth_headers).json()
    cs408 = next(s for s in subjects if s["code"] == "cs408")
    kp = cs408["knowledge_points"][4]
    with test_db() as db:
        t = db.scalar(select(StudyTask).where(StudyTask.status == "PENDING"))
        assert t is not None
        t.scheduled_date = date.today() - timedelta(days=4)
        db.add(
            KnowledgeMastery(
                user_id=t.user_id,
                knowledge_point_id=kp["id"],
                practice_count=6,
                correct_count=1,
                wrong_count=5,
                is_weak=True,
            )
        )
        db.commit()

    replan_res = client.post(
        "/api/replan",
        headers=auth_headers,
        json={"reason": "逾期较多且408操作系统需要加量"},
    )
    assert replan_res.status_code == 200
    rp = replan_res.json()
    assert rp["plan"]["version"] == 2
    assert rp["diff_summary"]["previous_version"] == 1
    assert rp["diff_summary"]["overdue_cleared_count"] >= 1
    assert rp["diff_summary"]["added_weak_tasks_count"] >= 1

    # Profile status updated to PLAN_ADJUSTED & old plan archived
    prof = client.get("/api/profile", headers=auth_headers).json()
    assert prof["profile_status"] == "PLAN_ADJUSTED"
    with test_db() as db:
        v1 = db.scalar(
            select(StudyPlan).where(StudyPlan.plan_type == "YEAR", StudyPlan.version == 1)
        )
        assert v1 is not None and v1.status == "ARCHIVED"

    # Compare versions
    diff_res = client.get("/api/plan/compare", headers=auth_headers)
    assert diff_res.status_code == 200
    diff = diff_res.json()
    assert diff["old_version"]["version"] == 1
    assert diff["new_version"]["version"] == 2
    assert diff["delta"]["weak_boost_added"] >= 1


def test_rag_chat_persistence_and_school_analysis(client, auth_headers, test_db):
    # KnowledgeDocument metadata synced on DB init
    with test_db() as db:
        docs = db.scalars(select(KnowledgeDocument)).all()
        assert len(docs) >= 5
        assert all(d.status == "INDEXED" and d.chunk_count > 0 for d in docs)

    chat_res = client.post(
        "/api/chat",
        headers=auth_headers,
        json={
            "message": "408 操作系统死锁和虚拟内存怎么复习？",
            "history": [],
            "session_id": "kaoyan_s1",
        },
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["source"] == "fallback"
    assert chat_data["sources"] == []  # Fallback must never fabricate sources
    assert chat_data["reply"]

    history_res = client.get(
        "/api/chat/history?session_id=kaoyan_s1",
        headers=auth_headers,
    )
    assert history_res.status_code == 200
    msgs = history_res.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "model"

    with test_db() as db:
        assert len(db.scalars(select(ChatMessageRecord)).all()) == 2

    # School analysis endpoint
    school_res = client.post(
        "/api/school/analyze",
        headers=auth_headers,
        json={
            "target_school": "上海交通大学",
            "target_major": "电子信息",
            "target_score": 395,
            "current_level": "Intermediate",
            "undergrad_bg": "211软件工程",
            "region_preference": "长三角",
        },
    )
    assert school_res.status_code == 200
    school_data = school_res.json()
    assert school_data["target_school"] == "上海交通大学"
    assert len(school_data["tier_recommendations"]) == 3
    assert school_data["source"] == "fallback"
