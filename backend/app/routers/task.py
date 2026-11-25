from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import StudyFeedback, StudyRecord, StudyTask, Subject, User

router = APIRouter(prefix="/api/task", tags=["Task"])


class CompleteTaskRequest(BaseModel):
    actual_minutes: Optional[int] = Field(None, gt=0, le=960, description="实际学习时长（分钟）")
    note: str = Field("", max_length=2000, description="学习备注")
    self_rating: Optional[int] = Field(None, ge=1, le=5, description="自评掌握度（1-5）")
    difficulty_feeling: Optional[Literal["EASY", "MODERATE", "HARD"]] = Field(
        None, description="难度感受"
    )


def mark_overdue_tasks(db: Session, user_id: int, reference_date: Optional[date] = None) -> int:
    """Mark unfinished tasks scheduled before today as OVERDUE."""
    today = reference_date or date.today()
    overdue_candidates = db.scalars(
        select(StudyTask).where(
            StudyTask.user_id == user_id,
            StudyTask.scheduled_date.is_not(None),
            StudyTask.scheduled_date < today,
            StudyTask.status.in_(["PENDING", "IN_PROGRESS"]),
        )
    ).all()
    if not overdue_candidates:
        return 0
    for task in overdue_candidates:
        task.status = "OVERDUE"
    db.commit()
    return len(overdue_candidates)


def _serialize_task(task: StudyTask, subject_names: dict[int, str]) -> dict:
    return {
        "id": task.id,
        "plan_id": task.plan_id,
        "subject_id": task.subject_id,
        "subject_name": subject_names.get(task.subject_id, "综合") if task.subject_id else "综合",
        "knowledge_point_id": task.knowledge_point_id,
        "title": task.title,
        "description": task.description,
        "estimated_minutes": task.estimated_minutes,
        "scheduled_date": task.scheduled_date.isoformat() if task.scheduled_date else None,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "priority": task.priority,
        "status": task.status,
    }


@router.get("/today")
def get_today_tasks(
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch scheduled tasks for the requested date (default today) plus overdue tasks."""
    mark_overdue_tasks(db, current_user.id, date.today())
    query_date = target_date or date.today()

    subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}

    today_tasks = db.scalars(
        select(StudyTask)
        .where(
            StudyTask.user_id == current_user.id,
            StudyTask.scheduled_date == query_date,
            StudyTask.status.notin_(["RESCHEDULED", "CANCELLED"]),
        )
        .order_by(StudyTask.priority.desc(), StudyTask.id.asc())
    ).all()

    overdue_tasks = db.scalars(
        select(StudyTask)
        .where(
            StudyTask.user_id == current_user.id,
            StudyTask.status == "OVERDUE",
        )
        .order_by(StudyTask.scheduled_date.asc(), StudyTask.priority.desc(), StudyTask.id.asc())
    ).all()

    return {
        "date": query_date.isoformat(),
        "task_list": [_serialize_task(t, subject_names) for t in today_tasks],
        "overdue_tasks": [_serialize_task(t, subject_names) for t in overdue_tasks],
        "total_minutes": sum(t.estimated_minutes for t in today_tasks),
        "completed_count": sum(1 for t in today_tasks if t.status == "COMPLETED"),
    }


@router.post("/{task_id}/start")
def start_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transition a task to IN_PROGRESS."""
    task = db.scalar(
        select(StudyTask).where(
            StudyTask.id == task_id,
            StudyTask.user_id == current_user.id,
        )
    )
    if task is None:
        raise HTTPException(status_code=404, detail="学习任务不存在")

    if task.status in ("PENDING", "OVERDUE"):
        task.status = "IN_PROGRESS"
        db.commit()
        db.refresh(task)

    subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}
    return {"task": _serialize_task(task, subject_names)}


@router.post("/{task_id}/complete")
def complete_task(
    task_id: int,
    payload: Optional[CompleteTaskRequest] = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Complete a study task and automatically persist a StudyRecord (plus optional StudyFeedback)."""
    task = db.scalar(
        select(StudyTask).where(
            StudyTask.id == task_id,
            StudyTask.user_id == current_user.id,
        )
    )
    if task is None:
        raise HTTPException(status_code=404, detail="学习任务不存在")

    actual_minutes = (
        payload.actual_minutes
        if payload and payload.actual_minutes is not None
        else task.estimated_minutes
    )
    note_text = payload.note.strip() if payload and payload.note else ""

    task.status = "COMPLETED"
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(minutes=actual_minutes)

    record = StudyRecord(
        user_id=current_user.id,
        task_id=task.id,
        start_time=start_time,
        end_time=end_time,
        actual_minutes=actual_minutes,
        completion_status="COMPLETED",
        note=note_text,
    )
    db.add(record)
    db.flush()

    if payload and (
        payload.self_rating is not None
        or payload.difficulty_feeling is not None
        or bool(note_text)
    ):
        db.add(
            StudyFeedback(
                user_id=current_user.id,
                task_id=task.id,
                record_id=record.id,
                self_rating=payload.self_rating or 3,
                difficulty_feeling=payload.difficulty_feeling or "MODERATE",
                note=note_text,
            )
        )

    db.commit()
    db.refresh(task)
    subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}
    return {
        "task": _serialize_task(task, subject_names),
        "record_id": record.id,
    }
