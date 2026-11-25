from typing import Optional

from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai_deps import AIConnection, get_ai_connection
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.plan_service import PlanService
from app.services.replan_service import ReplanService

router = APIRouter(prefix="/api/plan", tags=["Plan"])
replan_router = APIRouter(prefix="/api", tags=["Plan"])


class ReplanRequest(BaseModel):
    reason: str = Field("", max_length=500, description="用户触发调整的原因说明")


@router.post("/generate")
def generate_kaoyan_plan(
    ai: AIConnection = Depends(get_ai_connection),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and persist a hierarchical kaoyan study plan from the user's profile."""
    plan = PlanService.generate_and_save_plan(db=db, user=current_user, ai=ai)
    return {"plan": plan}


@router.get("/current")
def get_current_kaoyan_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the active hierarchical kaoyan study plan for the current user."""
    plan = PlanService.get_current_plan(db=db, user_id=current_user.id)
    return {"has_plan": plan is not None, "plan": plan}


@router.get("/versions")
def list_kaoyan_plan_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all historical and active plan versions for the current user."""
    versions = PlanService.list_plan_versions(db=db, user_id=current_user.id)
    return {"versions": versions}


@router.get("/compare")
def compare_plan_versions(
    old_id: Optional[int] = Query(None),
    new_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare two plan versions (defaults to latest vs previous)."""
    return ReplanService.compare_versions(
        db=db,
        user_id=current_user.id,
        old_id=old_id,
        new_id=new_id,
    )


@replan_router.post("/replan")
def trigger_replan(
    payload: Optional[ReplanRequest] = Body(default=None),
    ai: AIConnection = Depends(get_ai_connection),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI dynamic plan adjustment based on records, overdue tasks, and weak points."""
    return ReplanService.replan(
        db=db,
        user=current_user,
        ai=ai,
        reason=payload.reason if payload else "",
    )
