from datetime import datetime, timezone
import json
import time
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.agents.planner import PlannerAgent
from app.ai_deps import AIConnection, get_ai_connection
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import AgentExecution, User

router = APIRouter(prefix="/api/school", tags=["School Analysis"])


class SchoolAnalysisRequest(BaseModel):
    target_school: str = Field(..., min_length=1, max_length=100)
    target_major: str = Field(..., min_length=1, max_length=100)
    target_score: Optional[int] = Field(None, ge=100, le=500)
    current_level: Literal["Beginner", "Intermediate", "Advanced"] = "Intermediate"
    undergrad_bg: str = Field("", max_length=200)
    region_preference: str = Field("", max_length=100)

    @field_validator("target_school", "target_major")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("该字段不能为空")
        return cleaned


@router.post("/analyze")
def analyze_school(
    payload: SchoolAnalysisRequest,
    ai: AIConnection = Depends(get_ai_connection),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze target kaoyan university & major competitiveness and recommend 3-tier options."""
    started_at = datetime.now(timezone.utc)
    t0 = time.monotonic()
    agent = PlannerAgent(api_key=ai.api_key, base_url=ai.base_url, model=ai.model)
    report, source, fallback_reason = agent.analyze_target_school(
        target_school=payload.target_school,
        target_major=payload.target_major,
        target_score=payload.target_score,
        current_level=payload.current_level,
        undergrad_bg=payload.undergrad_bg,
        region_preference=payload.region_preference,
    )
    latency_ms = int((time.monotonic() - t0) * 1000)

    db.add(
        AgentExecution(
            user_id=current_user.id,
            execution_type="ANALYSIS",
            input_summary=json.dumps(
                {
                    "school": payload.target_school,
                    "major": payload.target_major,
                    "target_score": payload.target_score,
                },
                ensure_ascii=False,
            ),
            output_summary=json.dumps(
                {"difficulty": report.difficulty_level, "source": source},
                ensure_ascii=False,
            ),
            status="SUCCESS" if source == "llm" else "FALLBACK",
            trigger_source="USER_REQUEST",
            latency_ms=latency_ms,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    return {
        **report.model_dump(),
        "source": source,
        "fallback_reason": fallback_reason,
    }
