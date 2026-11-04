from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.models import (
    PlannerRequest, StudyPlan,
    ExamPrepRequest, ExamPrepResponse,
    CareerGuidanceRequest, CareerGuidanceResponse,
    ProjectRequest, ProjectResponse,
    ChatRequest, ChatResponse
)
from app.agents.planner import PlannerAgent
from app.agents.exam_prep import ExamPrepAgent
from app.agents.career import CareerAgent
from app.agents.project import ProjectAgent
from app.agents.base_agent import BaseAgent, AIConfigurationError, AIProviderError
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEST_CONNECTION_TIMEOUT_SECONDS = 20

app = FastAPI(
    title="Smart Student Success Agent API",
    description="Backend API for the AI-powered student academic and career success dashboard.",
    version="1.0.0"
)

# Configure CORS so our React frontend can access it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass(frozen=True)
class AIConnection:
    """Provider settings for one request (headers override .env defaults)."""

    api_key: str
    base_url: str
    model: str


def get_ai_connection(
    x_ai_api_key: Optional[str] = Header(None),
    x_ai_base_url: Optional[str] = Header(None),
    x_ai_model: Optional[str] = Header(None),
) -> AIConnection:
    """
    Resolve the domestic LLM provider configuration.

    The browser sends the values configured on the Settings page through
    X-AI-Api-Key / X-AI-Base-Url / X-AI-Model; anything missing falls back to .env.
    """
    base_url = (x_ai_base_url or settings.AI_BASE_URL or "").strip().rstrip("/")
    if not base_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail=f"AI 接口地址无效：{base_url or '空'}，必须以 http:// 或 https:// 开头。",
        )

    api_key = (x_ai_api_key or settings.AI_API_KEY or "").strip()
    model = (x_ai_model or settings.AI_MODEL or "").strip()
    if not model:
        raise HTTPException(status_code=400, detail="AI 模型名称不能为空。")

    return AIConnection(api_key=api_key, base_url=base_url, model=model)


def _build_agent(agent_cls, ai: AIConnection):
    return agent_cls(api_key=ai.api_key, base_url=ai.base_url, model=ai.model)


def _to_http_error(exc: Exception, action: str) -> HTTPException:
    """Map agent exceptions onto meaningful HTTP responses."""
    if isinstance(exc, AIConfigurationError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, AIProviderError):
        return HTTPException(status_code=502, detail=str(exc))
    logger.error("Error in %s: %s", action, exc)
    return HTTPException(status_code=500, detail=f"{action}失败：{exc}")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart Student Success Agent API. Access docs at /docs."}


@app.get("/api/ai-status")
def ai_status():
    """Report whether a server-side provider key exists (never the key itself)."""
    return {
        "configured": bool(settings.AI_API_KEY),
        "baseUrl": settings.AI_BASE_URL,
        "model": settings.AI_MODEL,
    }


@app.post("/api/ai-test")
def test_ai_provider(ai: AIConnection = Depends(get_ai_connection)):
    """Verify the configured provider with one minimal real request."""
    try:
        agent = BaseAgent(
            api_key=ai.api_key,
            base_url=ai.base_url,
            model=ai.model,
            request_timeout=TEST_CONNECTION_TIMEOUT_SECONDS,
        )
        return agent.test_connection()
    except Exception as e:
        raise _to_http_error(e, "测试 AI 连接") from e


@app.post("/api/planner", response_model=StudyPlan)
async def generate_study_plan(req: PlannerRequest, ai: AIConnection = Depends(get_ai_connection)):
    try:
        return _build_agent(PlannerAgent, ai).generate_plan(req)
    except Exception as e:
        raise _to_http_error(e, "生成学习计划") from e


@app.post("/api/exam-prep", response_model=ExamPrepResponse)
async def generate_exam_prep(req: ExamPrepRequest, ai: AIConnection = Depends(get_ai_connection)):
    try:
        return _build_agent(ExamPrepAgent, ai).generate_prep_material(req)
    except Exception as e:
        raise _to_http_error(e, "生成备考资料") from e


@app.post("/api/career", response_model=CareerGuidanceResponse)
async def generate_career_guidance(req: CareerGuidanceRequest, ai: AIConnection = Depends(get_ai_connection)):
    try:
        return _build_agent(CareerAgent, ai).generate_career_guidance(req)
    except Exception as e:
        raise _to_http_error(e, "生成职业指导") from e


@app.post("/api/projects", response_model=ProjectResponse)
async def generate_project_recommendations(req: ProjectRequest, ai: AIConnection = Depends(get_ai_connection)):
    try:
        return _build_agent(ProjectAgent, ai).generate_projects(req)
    except Exception as e:
        raise _to_http_error(e, "生成项目推荐") from e


@app.post("/api/chat", response_model=ChatResponse)
async def chat_assistant(req: ChatRequest, ai: AIConnection = Depends(get_ai_connection)):
    try:
        agent = _build_agent(BaseAgent, ai)

        system_instruction = (
            "You are the Academic and Career Mentor Chatbot for the Smart Student Success app. "
            "You help polytechnic students, university students, self-learners, and job seekers "
            "with academic planning, exam strategies, skill development, and portfolio projects. "
            "Be encouraging, highly professional, structured, and clear. "
            "Keep your responses relatively brief (150-250 words) and format key terms in bold. "
            "Always reply in Simplified Chinese. Keep product names, agent names, and technical terms in English when appropriate. "
            "Always keep the conversation focused on educational and career matters. "
            "If the user asks questions outside this context, politely guide them back."
        )

        # Determine current context for better fallback responses
        subject = req.context.get("subject", "") if req.context else ""
        career = req.context.get("career", "") if req.context else ""

        def fallback():
            msg = req.message.lower()

            # Simple rules for interactive fallback replies
            if any(word in msg for word in ("hello", "hi", "你好", "您好")):
                reply = (
                    "你好！我是你的 **AI Academic & Career Success Assistant**。我可以帮助你：\n\n"
                    "1. 制定个性化的每周 **Study Plans**。\n"
                    "2. 生成学习指南、选择题练习和 **Exam Prep** 复习清单。\n"
                    "3. 提供 **Career Roadmaps** 并分析技能差距。\n"
                    "4. 推荐可写入简历的 **Portfolio Projects**，并生成 GitHub README。\n\n"
                    "你今天想学习什么，或者你的理想职业是什么？"
                )
                qs = ["如何制定学习计划？", "我可以做哪些项目？", "请解释机器学习。"]
            elif any(word in msg for word in ("plan", "study", "schedule", "计划", "学习", "安排")):
                reply = (
                    "如需生成专属学习计划，请进入 **Study Planner** 页面。"
                    "填写科目、考试日期和每天可安排的学习时长后，我会为你生成逐日学习清单。"
                    "你也可以继续询问 **Pomodoro technique** 或 **Spaced Repetition** 等学习方法。"
                )
                qs = ["介绍一下 Spaced Repetition", "如何学习数据库系统？", "有哪些好的学习习惯？"]
            elif any(word in msg for word in ("career", "job", "intern", "职业", "工作", "实习")):
                reply = (
                    "职业规划可以从明确目标开始。请进入 **Career Guidance** 页面，"
                    "填写目标岗位（例如 *Web Developer* 或 *AI Engineer*）、当前技能和兴趣方向。"
                    "我会为你生成阶段式成长路线，并分析待补齐的 **skills gaps**。\n\n"
                    "你希望进入哪个行业？"
                )
                qs = ["如何成为 AI Engineer？", "软件工程需要哪些技能？", "推荐一些 Web 开发课程。"]
            elif any(word in msg for word in ("project", "readme", "github", "项目", "作品集")):
                reply = (
                    "实践项目是巩固知识并提升就业竞争力的有效方式。**Project Recommendations** 页面会"
                    "根据你的技术栈推荐从入门到进阶的项目方案，并生成可直接使用的 **GitHub README.md** 模板。\n\n"
                    "你偏好使用哪些技术（例如 React、Python、FastAPI）？"
                )
                qs = ["推荐一个 Python 项目", "给我一个 React 作品集项目", "GitHub README 应该包含什么？"]
            else:
                reply = (
                    f"关于你的问题 **{req.message[:30]}...**，建议先拆解目标，再保持稳定、有结构的练习节奏。"
                    "可以尝试模块化整理知识，或定期复习核心概念。"
                    "如果你正在学习 " + (f"**{subject}**" if subject else "具体课程") + "，或目标是进入 " + (f"**{career}**" if career else "软件工程领域") + "，"
                    "可以前往侧边栏对应的智能代理获取更深入的分析。"
                )
                qs = ["给我一些考试复习建议", "哪些项目适合写在简历中？", "如何准备编程面试？"]

            return reply, qs

        reply, suggested_qs = agent.generate_chat_reply(
            history=req.history,
            user_message=req.message,
            system_instruction=system_instruction,
            fallback_func=fallback
        )

        return ChatResponse(reply=reply, suggested_questions=suggested_qs)
    except Exception as e:
        raise _to_http_error(e, "处理对话") from e
