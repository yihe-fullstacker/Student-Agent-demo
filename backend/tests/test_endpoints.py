import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.main import app

client = TestClient(app)

PLANNER_PAYLOAD = {
    "subject_name": "Operating Systems",
    "exam_date": "2026-07-15",
    "weak_topics": ["Virtual Memory", "Deadlocks"],
    "daily_hours": 3.0,
    "current_level": "Beginner",
}

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]

def test_planner_endpoint():
    response = client.post("/api/planner", json=PLANNER_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["subject_name"] == "Operating Systems"
    assert "weekly_schedule" in data
    assert "milestones" in data

def test_exam_prep_endpoint():
    payload = {
        "topic": "Process Synchronization",
        "exam_format": "All",
        "number_of_questions": 4,
        "difficulty": "Advanced"
    }
    response = client.post("/api/exam-prep", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Process Synchronization"
    assert len(data["quizzes"]) == 4

def test_career_endpoint():
    payload = {
        "interests": ["Kernel dev", "Security"],
        "target_career": "Systems Engineer",
        "current_skills": ["C++", "C"],
        "academic_level": "Polytechnic"
    }
    response = client.post("/api/career", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["target_career"] == "Systems Engineer"
    assert "roadmap" in data

def test_projects_endpoint():
    payload = {
        "domain": "Systems Programming",
        "difficulty": "Advanced",
        "tech_stack": ["Rust", "Linux"],
        "project_scope": "Individual"
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "projects" in data
    assert len(data["projects"]) > 0

def test_chat_endpoint():
    payload = {
        "message": "Hi, I need help studying databases",
        "history": [],
        "context": {"subject": "Databases"}
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "suggested_questions" in data


def test_ai_status_reports_server_key(monkeypatch):
    monkeypatch.setattr(settings, "AI_API_KEY", "sk-test")
    response = client.get("/api/ai-status")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert "apiKey" not in data


def test_ai_status_without_key():
    response = client.get("/api/ai-status")
    assert response.status_code == 200
    assert response.json()["configured"] is False


def test_ai_test_requires_key():
    response = client.post("/api/ai-test")
    assert response.status_code == 400
    assert "密钥" in response.json()["detail"]


def test_planner_requires_api_key_when_fallback_disabled(monkeypatch):
    monkeypatch.setattr(settings, "ALLOW_DEMO_FALLBACK", False)
    response = client.post("/api/planner", json=PLANNER_PAYLOAD)
    assert response.status_code == 400
    assert "密钥" in response.json()["detail"]


def test_invalid_base_url_header_is_rejected():
    response = client.post(
        "/api/planner",
        json=PLANNER_PAYLOAD,
        headers={"X-AI-Base-Url": "ftp://example.com"},
    )
    assert response.status_code == 400
    assert "http" in response.json()["detail"]


def test_custom_provider_headers_are_forwarded(monkeypatch):
    """The headers from the Settings page must reach the agent constructor."""
    captured = {}

    def fake_generate_plan(self, req):
        captured["base_url"] = self.base_url
        captured["model"] = self.model
        captured["api_key"] = self.api_key
        raise RuntimeError("stop before any network call")

    monkeypatch.setattr("app.main.PlannerAgent.generate_plan", fake_generate_plan)
    response = client.post(
        "/api/planner",
        json=PLANNER_PAYLOAD,
        headers={
            "X-AI-Api-Key": "sk-test",
            "X-AI-Base-Url": "https://api.moonshot.cn/v1",
            "X-AI-Model": "moonshot-v1-8k",
        },
    )
    assert response.status_code == 500
    assert captured["base_url"] == "https://api.moonshot.cn/v1"
    assert captured["model"] == "moonshot-v1-8k"
    assert captured["api_key"] == "sk-test"
