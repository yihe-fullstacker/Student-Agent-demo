import pytest
from app.models import PlannerRequest, ExamPrepRequest, CareerGuidanceRequest, ProjectRequest, ChatRequest, ChatMessage
from app.agents.planner import PlannerAgent
from app.agents.exam_prep import ExamPrepAgent
from app.agents.career import CareerAgent
from app.agents.project import ProjectAgent
from app.agents.base_agent import BaseAgent

def test_planner_agent_mock():
    # Test that the planner agent generates a study plan matching the schema
    agent = PlannerAgent(api_key="")
    req = PlannerRequest(
        subject_name="Databases",
        exam_date="2026-07-20",
        weak_topics=["Normalization", "SQL Joins"],
        daily_hours=2.5,
        current_level="Intermediate"
    )
    res = agent.generate_plan(req)
    assert res.subject_name == "Databases"
    assert len(res.weekly_schedule) > 0
    assert len(res.milestones) > 0
    assert len(res.exam_readiness_checklist) > 0

def test_exam_prep_agent_mock():
    # Test that the exam prep agent generates materials matching the schema
    agent = ExamPrepAgent(api_key="")
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
    agent = CareerAgent(api_key="")
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
    agent = ProjectAgent(api_key="")
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
    agent = BaseAgent(api_key="")
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
