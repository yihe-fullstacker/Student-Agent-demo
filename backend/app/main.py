from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
import time

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.assistant import AssistantAgent
from app.agents.base_agent import AIConfigurationError, AIProviderError, BaseAgent
from app.agents.career import CareerAgent
from app.agents.exam_prep import ExamPrepAgent
from app.agents.planner import PlannerAgent
from app.agents.project import ProjectAgent
from app.ai_deps import AIConnection, get_ai_connection
from app.auth.dependencies import get_current_user
from app.config import DEFAULT_JWT_SECRET_KEY, settings
from app.db.database import check_db_health, get_db, init_db
from app.db.models import (
    AgentExecution,
    AgentMemory,
    ChatMessageRecord,
    ExamGoal,
    User,
    UserProfile,
)
from app.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from app.models import (
    CareerGuidanceRequest,
    CareerGuidanceResponse,
    ChatRequest,
    ChatResponse,
    ExamPrepRequest,
    ExamPrepResponse,
    PlannerRequest,
    ProjectRequest,
    ProjectResponse,
    StudyPlan,
)
from app.routers import (
    auth_router,
    exam_router,
    plan_router,
    profile_router,
    record_router,
    replan_router,
    school_router,
    task_router,
)
from app.services.scheduler import scheduler

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEST_CONNECTION_TIMEOUT_SECONDS = 20


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    if settings.ENV == "production" and settings.JWT_SECRET_KEY == DEFAULT_JWT_SECRET_KEY:
        logger.warning("JWT_SECRET_KEY is using the default development value in production!")
    if settings.ENABLE_SCHEDULER:
        scheduler.start()
    try:
        yield
    finally:
        await scheduler.stop()


app = FastAPI(
    title="Smart Student Success Agent API",
    description="Backend API for the AI-powered student academic and career success dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

# Register logging & rate limiting inside CORSMiddleware (last added = outermost in Starlette)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Configure CORS using explicit origin whitelist from environment settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-AI-Api-Key",
        "X-AI-Base-Url",
        "X-AI-Model",
    ],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(plan_router)
app.include_router(replan_router)
app.include_router(task_router)
app.include_router(record_router)
app.include_router(exam_router)
app.include_router(school_router)


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


@app.get("/api/health")
def health_check():
    """Verify service liveliness and database connectivity."""
    ok, _detail = check_db_health()
    if not ok:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "database": "disconnected",
                "detail": "数据服务暂时不可用",
            },
        )
    return {
        "status": "ok",
        "database": "connected",
        "env": settings.ENV,
    }


@app.get("/api/system/metrics")
def get_system_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate LLM execution counts, fallback rate, and average latency for monitoring."""
    rows = db.scalars(
        select(AgentExecution).where(AgentExecution.user_id == current_user.id)
    ).all()
    total_calls = len(rows)
    success_calls = sum(1 for r in rows if r.status == "SUCCESS")
    fallback_calls = sum(1 for r in rows if r.status == "FALLBACK")
    failed_calls = sum(1 for r in rows if r.status not in ("SUCCESS", "FALLBACK"))
    latencies = [r.latency_ms for r in rows if r.latency_ms is not None]
    avg_latency_ms = round(sum(latencies) / len(latencies), 1) if latencies else 0.0

    by_type: dict[str, int] = {}
    for r in rows:
        by_type[r.execution_type] = by_type.get(r.execution_type, 0) + 1

    return {
        "total_calls": total_calls,
        "success_calls": success_calls,
        "fallback_calls": fallback_calls,
        "failed_calls": failed_calls,
        "avg_latency_ms": avg_latency_ms,
        "by_type": by_type,
    }


@app.get("/api/ai-status")
def ai_status():
    """Report whether a server-side provider key exists (never the key itself)."""
    return {
        "configured": bool(settings.AI_API_KEY),
        "baseUrl": settings.AI_BASE_URL,
        "model": settings.AI_MODEL,
    }


@app.post("/api/ai-test")
def test_ai_provider(
    ai: AIConnection = Depends(get_ai_connection),
    _current_user: User = Depends(get_current_user),
):
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
async def generate_study_plan(
    req: PlannerRequest,
    ai: AIConnection = Depends(get_ai_connection),
    _current_user: User = Depends(get_current_user),
):
    try:
        return _build_agent(PlannerAgent, ai).generate_plan(req)
    except Exception as e:
        raise _to_http_error(e, "生成学习计划") from e


@app.post("/api/exam-prep", response_model=ExamPrepResponse)
async def generate_exam_prep(
    req: ExamPrepRequest,
    ai: AIConnection = Depends(get_ai_connection),
    _current_user: User = Depends(get_current_user),
):
    try:
        return _build_agent(ExamPrepAgent, ai).generate_prep_material(req)
    except Exception as e:
        raise _to_http_error(e, "生成备考资料") from e


@app.post("/api/career", response_model=CareerGuidanceResponse)
async def generate_career_guidance(
    req: CareerGuidanceRequest,
    ai: AIConnection = Depends(get_ai_connection),
    _current_user: User = Depends(get_current_user),
):
    try:
        return _build_agent(CareerAgent, ai).generate_career_guidance(req)
    except Exception as e:
        raise _to_http_error(e, "生成职业指导") from e


@app.post("/api/projects", response_model=ProjectResponse)
async def generate_project_recommendations(
    req: ProjectRequest,
    ai: AIConnection = Depends(get_ai_connection),
    _current_user: User = Depends(get_current_user),
):
    try:
        return _build_agent(ProjectAgent, ai).generate_projects(req)
    except Exception as e:
        raise _to_http_error(e, "生成项目推荐") from e


@app.post("/api/chat", response_model=ChatResponse)
async def chat_assistant(
    req: ChatRequest,
    ai: AIConnection = Depends(get_ai_connection),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        agent = _build_agent(AssistantAgent, ai)
        session_id = (req.session_id or "default").strip() or "default"

        profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
        goal = db.scalar(
            select(ExamGoal)
            .where(ExamGoal.user_id == current_user.id, ExamGoal.status == "ACTIVE")
            .order_by(ExamGoal.id.desc())
        )
        profile_summary = ""
        if goal is not None:
            profile_summary = f"{goal.exam_year}考研 {goal.school} {goal.major}"
            if profile:
                profile_summary += f"（水平：{profile.learning_level}，每日{profile.daily_minutes}分钟）"

        memories = [
            m.content
            for m in db.scalars(
                select(AgentMemory)
                .where(AgentMemory.user_id == current_user.id)
                .order_by(AgentMemory.importance.desc(), AgentMemory.id.desc())
                .limit(3)
            ).all()
        ]

        started_at = datetime.now(timezone.utc)
        t0 = time.monotonic()
        reply, suggested_qs, sources, source_mode = agent.answer_question(
            user_message=req.message,
            history=req.history,
            context=req.context,
            profile_summary=profile_summary,
            memories=memories,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        db.add(
            ChatMessageRecord(
                user_id=current_user.id,
                session_id=session_id,
                role="user",
                content=req.message,
                sources_json=None,
                generated_by="user",
            )
        )
        db.add(
            ChatMessageRecord(
                user_id=current_user.id,
                session_id=session_id,
                role="model",
                content=reply,
                sources_json=json.dumps(sources, ensure_ascii=False),
                generated_by=source_mode,
            )
        )
        db.add(
            AgentExecution(
                user_id=current_user.id,
                execution_type="CHAT",
                input_summary=req.message[:200],
                output_summary=reply[:200],
                status="SUCCESS" if source_mode == "llm" else "FALLBACK",
                trigger_source="USER_REQUEST",
                latency_ms=latency_ms,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        return ChatResponse(
            reply=reply,
            suggested_questions=suggested_qs,
            sources=sources,
            source=source_mode,
            session_id=session_id,
        )
    except Exception as e:
        raise _to_http_error(e, "处理对话") from e


@app.get("/api/chat/history")
def get_chat_history(
    session_id: str = Query("default"),
    limit: int = Query(40, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return persisted chat messages for a user session."""
    rows = db.scalars(
        select(ChatMessageRecord)
        .where(
            ChatMessageRecord.user_id == current_user.id,
            ChatMessageRecord.session_id == session_id,
        )
        .order_by(ChatMessageRecord.id.desc())
        .limit(limit)
    ).all()
    rows.reverse()

    messages = []
    for row in rows:
        try:
            sources = json.loads(row.sources_json) if row.sources_json else []
        except ValueError:
            sources = []
        messages.append(
            {
                "id": row.id,
                "role": row.role,
                "content": row.content,
                "sources": sources,
                "source": row.generated_by,
                "created_at": row.created_at.isoformat(),
            }
        )
    return {"session_id": session_id, "messages": messages}
