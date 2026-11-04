import json
from types import SimpleNamespace

import pytest

from app.agents.base_agent import (
    AIConfigurationError,
    AIProviderError,
    extract_json_object,
    normalize_chat_reply,
)
from app.agents.career import CareerAgent
from app.agents.exam_prep import ExamPrepAgent
from app.agents.planner import PlannerAgent
from app.agents.project import ProjectAgent
from app.agents.base_agent import BaseAgent
from app.models import (
    CareerGuidanceRequest,
    ChatMessage,
    ExamPrepRequest,
    PlannerRequest,
    ProjectRequest,
)

PLANNER_REQUEST = PlannerRequest(
    subject_name="Databases",
    exam_date="2026-07-20",
    weak_topics=["Normalization", "SQL Joins"],
    daily_hours=2.5,
    current_level="Intermediate",
)

VALID_PLAN = {
    "subject_name": "Databases",
    "weekly_schedule": [
        {
            "week_number": 1,
            "weekly_goal": "掌握范式",
            "days": [
                {
                    "day_name": "周一",
                    "topic": "第一范式",
                    "subtopics": ["1NF"],
                    "duration_hours": 2.5,
                    "priority": "High",
                    "activities": ["阅读教材"],
                }
            ],
        }
    ],
    "milestones": [{"title": "基准测试", "target_date": "第一周", "description": "完成入门练习"}],
    "exam_readiness_checklist": ["复习笔记"],
}


def fake_client(replies):
    """Fake OpenAI client returning canned assistant messages in order."""
    queue = list(replies)

    def create(**kwargs):
        item = queue.pop(0)
        if isinstance(item, Exception):
            raise item
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=item))]
        )

    return SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))
    )


def make_agent(replies, allow_fallback=False):
    """Build a planner agent whose client returns canned replies."""

    agent = PlannerAgent(
        api_key="test-key",
        base_url="https://example.com/v1",
        model="test-model",
        allow_fallback=allow_fallback,
    )
    agent.client = fake_client(replies)
    agent.is_client_active = True
    return agent


def test_planner_agent_mock():
    # Test that the planner agent generates a study plan matching the schema
    agent = PlannerAgent(api_key="", allow_fallback=True)
    res = agent.generate_plan(PLANNER_REQUEST)
    assert res.subject_name == "Databases"
    assert len(res.weekly_schedule) > 0
    assert len(res.milestones) > 0
    assert len(res.exam_readiness_checklist) > 0


def test_exam_prep_agent_mock():
    # Test that the exam prep agent generates materials matching the schema
    agent = ExamPrepAgent(api_key="", allow_fallback=True)
    req = ExamPrepRequest(
        topic="Supervised Learning",
        exam_format="All",
        number_of_questions=3,
        difficulty="Intermediate"
      )
    res = agent.generate_prep_material(req)
    assert res.topic == "Supervised Learning"
    assert len(res.quizzes) == 3
    assert len(res.important_questions) > 0
    assert len(res.checklist) > 0


def test_career_agent_mock():
    # Test career agent matching schema
    agent = CareerAgent(api_key="", allow_fallback=True)
    req = CareerGuidanceRequest(
        interests=["AI", "Robots"],
        target_career="AI Engineer",
        current_skills=["Python"],
        academic_level="University"
    )
    res = agent.generate_career_guidance(req)
    assert res.target_career == "AI Engineer"
    assert len(res.roadmap) > 0
    assert len(res.skills_gap_analysis) > 0


def test_project_agent_mock():
    # Test project advisor agent matching schema
    agent = ProjectAgent(api_key="", allow_fallback=True)
    req = ProjectRequest(
        domain="Web Development",
        difficulty="Beginner",
        tech_stack=["React", "Tailwind"],
        project_scope="Individual"
    )
    res = agent.generate_projects(req)
    assert len(res.projects) > 0
    assert "React" in res.projects[0].suggested_tech_stack or "Tailwind" in res.projects[0].suggested_tech_stack
    assert res.projects[0].readme_template != ""


def test_chat_agent_mock():
    # Test chat reply matches structure
    agent = BaseAgent(api_key="", allow_fallback=True)
    history = [
        ChatMessage(role="user", content="Hi"),
        ChatMessage(role="model", content="Hello! How can I help you?")
    ]
    reply, questions = agent.generate_chat_reply(
        history=history,
        user_message="I need a study planner.",
        system_instruction="You are a helpful assistant.",
        fallback_func=lambda: ("To get a plan, use the Study Planner tab.", ["How to schedule?", "Explain Pomodoro"])
    )
    assert reply != ""
    assert len(questions) > 0


def test_missing_api_key_raises_configuration_error():
    agent = PlannerAgent(api_key="", allow_fallback=False)
    with pytest.raises(AIConfigurationError):
        agent.generate_plan(PLANNER_REQUEST)


def test_structured_output_parses_fenced_json():
    agent = make_agent(["```json\n" + json.dumps(VALID_PLAN, ensure_ascii=False) + "\n```"])
    res = agent.generate_plan(PLANNER_REQUEST)
    assert res.subject_name == "Databases"
    assert res.weekly_schedule[0].days[0].day_name == "周一"


def test_structured_output_repairs_invalid_first_reply():
    agent = make_agent(["这不是 JSON", json.dumps(VALID_PLAN, ensure_ascii=False)])
    res = agent.generate_plan(PLANNER_REQUEST)
    assert res.subject_name == "Databases"


def test_provider_failure_raises_provider_error():
    agent = make_agent([RuntimeError("401 invalid api key")])
    with pytest.raises(AIProviderError):
        agent.generate_plan(PLANNER_REQUEST)


def test_provider_failure_uses_fallback_when_enabled():
    agent = make_agent([RuntimeError("401 invalid api key")], allow_fallback=True)
    res = agent.generate_plan(PLANNER_REQUEST)
    assert res.subject_name == "Databases"
    assert len(res.weekly_schedule) > 0


def test_extract_json_object_ignores_surrounding_text():
    assert extract_json_object('结果如下：{"a": 1} 希望有帮助') == {"a": 1}


def test_extract_json_object_rejects_empty():
    with pytest.raises(ValueError):
        extract_json_object("   ")


def test_connection_returns_provider_details():
    agent = BaseAgent(
        api_key="test-key",
        base_url="https://example.com/v1",
        model="test-model",
    )
    agent.client = fake_client(["连接成功"])
    agent.is_client_active = True

    result = agent.test_connection()
    assert result["ok"] is True
    assert result["model"] == "test-model"
    assert result["baseUrl"] == "https://example.com/v1"
    assert result["latencyMs"] >= 0


def test_connection_without_key_raises_configuration_error():
    agent = BaseAgent(api_key="", allow_fallback=False)
    with pytest.raises(AIConfigurationError):
        agent.test_connection()


def test_connection_failure_raises_provider_error():
    agent = BaseAgent(
        api_key="test-key",
        base_url="https://example.com/v1",
        model="test-model",
    )
    agent.client = fake_client([RuntimeError("401 Authentication Fails")])
    agent.is_client_active = True

    with pytest.raises(AIProviderError):
        agent.test_connection()


def test_chat_request_does_not_force_json_mode():
    calls = []

    def create(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="纯文本回答"))]
        )

    agent = BaseAgent(
        api_key="test-key",
        base_url="https://example.com/v1",
        model="test-model",
    )
    agent.client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))
    )
    agent.is_client_active = True

    reply, _questions = agent.generate_chat_reply(
        history=[],
        user_message="你好",
        system_instruction="你是学习助手",
        fallback_func=lambda: ("fallback", []),
    )

    assert reply == "纯文本回答"
    assert "response_format" not in calls[0]
    # The follow-up question request is allowed to use JSON mode.
    assert calls[1]["response_format"] == {"type": "json_object"}


def test_normalize_chat_reply_unwraps_json_object():
    raw = '{"type":"json_object","content":"第一行\\n\\n第二行"}'
    assert normalize_chat_reply(raw) == "第一行\n\n第二行"


def test_normalize_chat_reply_keeps_plain_text():
    assert normalize_chat_reply("你好！这是普通回答。") == "你好！这是普通回答。"
