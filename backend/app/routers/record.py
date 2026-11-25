import re
from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import (
    ExamGoal,
    KnowledgeMastery,
    StudyFeedback,
    StudyPlan,
    StudyRecord,
    StudyTask,
    Subject,
    User,
)
from app.routers.task import mark_overdue_tasks

router = APIRouter(prefix="/api/record", tags=["Record"])


class RecordFeedbackRequest(BaseModel):
    record_id: int = Field(..., description="学习记录ID")
    self_rating: int = Field(..., ge=1, le=5, description="自评掌握度（1-5）")
    difficulty_feeling: Literal["EASY", "MODERATE", "HARD"] = Field(
        "MODERATE", description="难度感受"
    )
    note: str = Field("", max_length=2000, description="学习备注")


def _extract_subject_label(task: StudyTask, subject_names: dict[int, str]) -> str:
    if task.subject_id and task.subject_id in subject_names:
        return subject_names[task.subject_id]
    match = re.match(r"^\[([^\]]+)\]", task.title or "")
    if match:
        return match.group(1)
    return "综合"


@router.get("/stats")
def get_record_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate study records, task completion, subject progress, and 4-week trend."""
    today = date.today()
    mark_overdue_tasks(db, current_user.id, today)

    records = db.scalars(
        select(StudyRecord).where(StudyRecord.user_id == current_user.id)
    ).all()
    total_study_minutes = sum(r.actual_minutes for r in records)
    today_study_minutes = sum(
        r.actual_minutes
        for r in records
        if r.end_time and r.end_time.date() == today
    )

    tasks = db.scalars(
        select(StudyTask).where(
            StudyTask.user_id == current_user.id,
            StudyTask.status.notin_(["RESCHEDULED", "CANCELLED"]),
        )
    ).all()
    total_tasks_count = len(tasks)
    completed_tasks_count = sum(1 for t in tasks if t.status == "COMPLETED")
    task_completion_rate = (
        round((completed_tasks_count / total_tasks_count) * 100, 1)
        if total_tasks_count > 0
        else 0.0
    )

    overdue_tasks = [t for t in tasks if t.status == "OVERDUE"]
    overdue_tasks_count = len(overdue_tasks)
    behind_days = (
        round(
            sum(
                max(0, (today - t.scheduled_date).days)
                for t in overdue_tasks
                if t.scheduled_date
            )
            / overdue_tasks_count,
            1,
        )
        if overdue_tasks_count > 0
        else 0.0
    )

    masteries = db.scalars(
        select(KnowledgeMastery).where(KnowledgeMastery.user_id == current_user.id)
    ).all()
    total_practice = sum(m.practice_count for m in masteries)
    total_correct = sum(m.correct_count for m in masteries)
    quiz_accuracy_rate = (
        round((total_correct / total_practice) * 100, 1)
        if total_practice > 0
        else 0.0
    )

    # Subject completion breakdown
    subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}
    subj_buckets: dict[str, dict[str, int]] = {}
    for t in tasks:
        label = _extract_subject_label(t, subject_names)
        bucket = subj_buckets.setdefault(label, {"completed": 0, "total": 0})
        bucket["total"] += 1
        if t.status == "COMPLETED":
            bucket["completed"] += 1

    subject_progress = [
        {
            "subject_name": name,
            "completed_count": b["completed"],
            "total_count": b["total"],
            "completion_rate": round((b["completed"] / b["total"]) * 100, 1) if b["total"] else 0.0,
        }
        for name, b in subj_buckets.items()
    ]

    # 4-week trend: prefer active plan's first 4 WEEK nodes if present; else rolling 4 weeks
    active_root = db.scalar(
        select(StudyPlan)
        .where(
            StudyPlan.user_id == current_user.id,
            StudyPlan.plan_type == "YEAR",
            StudyPlan.status == "ACTIVE",
        )
        .order_by(StudyPlan.version.desc(), StudyPlan.id.desc())
    )
    weekly_trend = []
    if active_root is not None:
        phase_ids = db.scalars(
            select(StudyPlan.id).where(StudyPlan.parent_id == active_root.id)
        ).all()
        week_plans = db.scalars(
            select(StudyPlan)
            .where(
                StudyPlan.user_id == current_user.id,
                StudyPlan.plan_type == "WEEK",
                StudyPlan.parent_id.in_(phase_ids + [active_root.id]),
            )
            .order_by(StudyPlan.start_date.asc(), StudyPlan.id.asc())
        ).all()[:4]

        records_by_task: dict[int, int] = {}
        for r in records:
            if r.task_id is not None:
                records_by_task[r.task_id] = records_by_task.get(r.task_id, 0) + r.actual_minutes

        for idx, wp in enumerate(week_plans, start=1):
            w_tasks = [t for t in tasks if t.plan_id == wp.id]
            planned_min = sum(t.estimated_minutes for t in w_tasks)
            actual_min = sum(records_by_task.get(t.id, 0) for t in w_tasks)
            completed_cnt = sum(1 for t in w_tasks if t.status == "COMPLETED")
            weekly_trend.append(
                {
                    "label": f"第 {idx} 周",
                    "planned_minutes": planned_min,
                    "actual_minutes": actual_min,
                    "completed_tasks": completed_cnt,
                    "total_tasks": len(w_tasks),
                }
            )

    if not weekly_trend:
        # Rolling 4 weeks ending today
        for offset in range(3, -1, -1):
            w_end = today - timedelta(days=offset * 7)
            w_start = w_end - timedelta(days=6)
            w_tasks = [
                t
                for t in tasks
                if t.scheduled_date and w_start <= t.scheduled_date <= w_end
            ]
            w_records = [
                r
                for r in records
                if r.end_time and w_start <= r.end_time.date() <= w_end
            ]
            weekly_trend.append(
                {
                    "label": f"近第{4 - offset}周",
                    "planned_minutes": sum(t.estimated_minutes for t in w_tasks),
                    "actual_minutes": sum(r.actual_minutes for r in w_records),
                    "completed_tasks": sum(1 for t in w_tasks if t.status == "COMPLETED"),
                    "total_tasks": len(w_tasks),
                }
            )

    goal = db.scalar(
        select(ExamGoal)
        .where(ExamGoal.user_id == current_user.id, ExamGoal.status == "ACTIVE")
        .order_by(ExamGoal.id.desc())
    )
    exam_countdown = None
    if goal is not None:
        days_remaining = max(0, (goal.exam_date - today).days) if goal.exam_date else None
        exam_countdown = {
            "school": goal.school,
            "major": goal.major,
            "exam_year": goal.exam_year,
            "exam_date": goal.exam_date.isoformat() if goal.exam_date else None,
            "target_score": goal.target_score,
            "days_remaining": days_remaining,
        }

    return {
        "total_study_minutes": total_study_minutes,
        "total_study_hours": round(total_study_minutes / 60, 1),
        "today_study_minutes": today_study_minutes,
        "completed_tasks_count": completed_tasks_count,
        "total_tasks_count": total_tasks_count,
        "task_completion_rate": task_completion_rate,
        "overdue_tasks_count": overdue_tasks_count,
        "behind_days": behind_days,
        "quiz_accuracy_rate": quiz_accuracy_rate,
        "subject_progress": subject_progress,
        "weekly_trend": weekly_trend,
        "exam_countdown": exam_countdown,
        "needs_replan_warning": behind_days >= 3 or overdue_tasks_count >= 3,
    }


@router.get("/list")
def list_study_records(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return chronological study records with task titles and latest feedback."""
    records = db.scalars(
        select(StudyRecord)
        .where(StudyRecord.user_id == current_user.id)
        .order_by(StudyRecord.created_at.desc(), StudyRecord.id.desc())
        .limit(limit)
    ).all()

    task_ids = [r.task_id for r in records if r.task_id is not None]
    tasks_map = (
        {
            t.id: t
            for t in db.scalars(select(StudyTask).where(StudyTask.id.in_(task_ids))).all()
        }
        if task_ids
        else {}
    )
    subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}

    record_ids = [r.id for r in records]
    feedbacks = (
        db.scalars(
            select(StudyFeedback)
            .where(
                StudyFeedback.user_id == current_user.id,
                StudyFeedback.record_id.in_(record_ids),
            )
            .order_by(StudyFeedback.id.asc())
        ).all()
        if record_ids
        else []
    )
    feedback_by_record = {f.record_id: f for f in feedbacks if f.record_id is not None}

    items = []
    for r in records:
        task = tasks_map.get(r.task_id) if r.task_id else None
        fb = feedback_by_record.get(r.id)
        items.append(
            {
                "id": r.id,
                "task_id": r.task_id,
                "task_title": task.title if task else "自主学习记录",
                "subject_name": _extract_subject_label(task, subject_names) if task else "综合",
                "start_time": r.start_time.isoformat(),
                "end_time": r.end_time.isoformat(),
                "actual_minutes": r.actual_minutes,
                "completion_status": r.completion_status,
                "note": r.note,
                "feedback": (
                    {
                        "id": fb.id,
                        "self_rating": fb.self_rating,
                        "difficulty_feeling": fb.difficulty_feeling,
                        "note": fb.note,
                    }
                    if fb
                    else None
                ),
                "created_at": r.created_at.isoformat(),
            }
        )
    return {"records": items}


@router.post("/feedback")
def submit_record_feedback(
    payload: RecordFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update self-evaluation feedback for an existing StudyRecord."""
    record = db.scalar(
        select(StudyRecord).where(
            StudyRecord.id == payload.record_id,
            StudyRecord.user_id == current_user.id,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="学习记录不存在")

    cleaned_note = payload.note.strip()
    if cleaned_note:
        record.note = cleaned_note

    fb = db.scalar(
        select(StudyFeedback)
        .where(
            StudyFeedback.user_id == current_user.id,
            StudyFeedback.record_id == record.id,
        )
        .order_by(StudyFeedback.id.desc())
    )
    if fb is None:
        fb = StudyFeedback(
            user_id=current_user.id,
            task_id=record.task_id,
            record_id=record.id,
            self_rating=payload.self_rating,
            difficulty_feeling=payload.difficulty_feeling,
            note=cleaned_note,
        )
        db.add(fb)
    else:
        fb.self_rating = payload.self_rating
        fb.difficulty_feeling = payload.difficulty_feeling
        fb.note = cleaned_note

    db.commit()
    db.refresh(fb)
    return {
        "feedback": {
            "id": fb.id,
            "record_id": fb.record_id,
            "self_rating": fb.self_rating,
            "difficulty_feeling": fb.difficulty_feeling,
            "note": fb.note,
        }
    }
