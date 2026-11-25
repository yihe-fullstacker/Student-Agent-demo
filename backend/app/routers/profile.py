import json
from datetime import date, datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import ExamGoal, Subject, User, UserProfile

router = APIRouter(prefix="/api", tags=["Profile"])


class KnowledgePointItem(BaseModel):
    id: int
    name: str
    difficulty: str
    importance: int


class SubjectItem(BaseModel):
    id: int
    code: str
    name: str
    category: str
    description: str
    knowledge_points: list[KnowledgePointItem]


class ProfileResponse(BaseModel):
    profile_id: int
    goal_id: Optional[int] = None
    exam_year: Optional[int] = None
    school: str = ""
    major: str = ""
    exam_date: Optional[date] = None
    target_score: Optional[int] = None
    subjects: list[str]
    daily_minutes: int
    learning_level: str
    weakness: str
    profile_status: str
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    exam_year: int = Field(..., ge=2025, le=2035, description="考研年份")
    school: str = Field(..., min_length=1, max_length=100, description="目标院校")
    major: str = Field(..., min_length=1, max_length=100, description="目标专业")
    exam_date: Optional[date] = Field(None, description="考试日期")
    target_score: Optional[int] = Field(None, ge=100, le=500, description="总目标分数")
    subjects: list[str] = Field(..., min_length=1, description="考试科目列表")
    daily_minutes: int = Field(..., gt=0, le=960, description="每日可学习分钟数，必须大于0")
    learning_level: Literal["Beginner", "Intermediate", "Advanced"] = Field(
        ..., description="当前基础水平"
    )
    weakness: str = Field("", max_length=2000, description="薄弱知识点描述")

    @field_validator("school", "major")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("该字段不能为空")
        return cleaned

    @field_validator("subjects")
    @classmethod
    def clean_subjects(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        cleaned: list[str] = []
        for item in value:
            name = item.strip()
            if name and name not in seen:
                seen.add(name)
                cleaned.append(name)
        if not cleaned:
            raise ValueError("请至少选择一门考试科目")
        return cleaned

    @field_validator("weakness")
    @classmethod
    def strip_weakness(cls, value: str) -> str:
        return value.strip()


def _parse_subjects_json(raw: str) -> list[str]:
    try:
        parsed = json.loads(raw or "[]")
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()]
    except ValueError:
        pass
    return []


def _build_profile_response(profile: UserProfile, goal: Optional[ExamGoal]) -> ProfileResponse:
    return ProfileResponse(
        profile_id=profile.id,
        goal_id=goal.id if goal else None,
        exam_year=goal.exam_year if goal else None,
        school=goal.school if goal else "",
        major=goal.major if goal else "",
        exam_date=goal.exam_date if goal else None,
        target_score=goal.target_score if goal else None,
        subjects=_parse_subjects_json(profile.subjects_json),
        daily_minutes=profile.daily_minutes,
        learning_level=profile.learning_level,
        weakness=profile.weakness,
        profile_status=profile.profile_status,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/subjects", response_model=list[SubjectItem])
def list_subjects(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Return seeded kaoyan subjects and their knowledge points."""
    subjects = db.scalars(
        select(Subject)
        .options(selectinload(Subject.knowledge_points))
        .order_by(Subject.id.asc())
    ).all()
    return [
        SubjectItem(
            id=s.id,
            code=s.code,
            name=s.name,
            category=s.category,
            description=s.description,
            knowledge_points=[
                KnowledgePointItem(
                    id=kp.id,
                    name=kp.name,
                    difficulty=kp.difficulty,
                    importance=kp.importance,
                )
                for kp in sorted(s.knowledge_points, key=lambda k: k.id)
            ],
        )
        for s in subjects
    ]


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch the current user's kaoyan profile and active exam goal."""
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if profile is None:
        profile = UserProfile(
            user_id=current_user.id,
            daily_minutes=180,
            learning_level="Intermediate",
            subjects_json="[]",
            weakness="",
            profile_status="UNFILLED",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    goal = db.scalar(
        select(ExamGoal)
        .where(ExamGoal.user_id == current_user.id, ExamGoal.status == "ACTIVE")
        .order_by(ExamGoal.id.desc())
    )
    return _build_profile_response(profile, goal)


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update the user's exam goal and study profile."""
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if profile is None:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.daily_minutes = payload.daily_minutes
    profile.learning_level = payload.learning_level
    profile.subjects_json = json.dumps(payload.subjects, ensure_ascii=False)
    profile.weakness = payload.weakness
    profile.profile_status = "PENDING_PLAN"

    goal = db.scalar(
        select(ExamGoal)
        .where(ExamGoal.user_id == current_user.id, ExamGoal.status == "ACTIVE")
        .order_by(ExamGoal.id.desc())
    )
    resolved_exam_date = payload.exam_date or date(payload.exam_year, 12, 20)
    if resolved_exam_date < date.today():
        raise HTTPException(status_code=400, detail="考试日期不能早于今天")

    if goal is None:
        goal = ExamGoal(
            user_id=current_user.id,
            exam_year=payload.exam_year,
            school=payload.school,
            major=payload.major,
            exam_date=resolved_exam_date,
            target_score=payload.target_score,
            status="ACTIVE",
        )
        db.add(goal)
    else:
        goal.exam_year = payload.exam_year
        goal.school = payload.school
        goal.major = payload.major
        goal.exam_date = resolved_exam_date
        goal.target_score = payload.target_score

    db.commit()
    db.refresh(profile)
    db.refresh(goal)
    return _build_profile_response(profile, goal)
