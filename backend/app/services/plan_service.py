import json
import time
from datetime import date, datetime, time as dt_time, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.planner import KaoyanPlanDraft, PlannerAgent
from app.ai_deps import AIConnection
from app.db.models import (
    AgentExecution,
    ExamGoal,
    StudyPlan,
    StudyTask,
    Subject,
    User,
    UserProfile,
)


def _parse_subjects(raw: str) -> list[str]:
    try:
        data = json.loads(raw or "[]")
        if isinstance(data, list):
            return [str(item).strip() for item in data if str(item).strip()]
    except ValueError:
        pass
    return []


def _match_subject_id(subject_name: str, subject_map: dict[str, int]) -> Optional[int]:
    normalized = subject_name.strip().lower()
    if normalized in subject_map:
        return subject_map[normalized]
    for key, sid in subject_map.items():
        if key in normalized or normalized in key:
            return sid
    return None


class PlanService:
    """Business service layer for hierarchical kaoyan study plans."""

    @staticmethod
    def generate_and_save_plan(
        db: Session,
        user: User,
        ai: AIConnection,
        trigger_source: str = "USER_REQUEST",
    ) -> dict[str, Any]:
        profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
        goal = db.scalar(
            select(ExamGoal)
            .where(ExamGoal.user_id == user.id, ExamGoal.status == "ACTIVE")
            .order_by(ExamGoal.id.desc())
        )
        subjects = _parse_subjects(profile.subjects_json) if profile else []

        if profile is None or goal is None or not subjects or profile.daily_minutes <= 0:
            raise HTTPException(
                status_code=400,
                detail="请先完善考生画像（目标院校、专业、考试科目与每日学习时间）后再生成计划。",
            )

        exam_date = goal.exam_date or date(goal.exam_year, 12, 20)
        started_at = datetime.now(timezone.utc)
        t0 = time.monotonic()

        agent = PlannerAgent(api_key=ai.api_key, base_url=ai.base_url, model=ai.model)
        draft, source, fallback_reason = agent.generate_kaoyan_plan(
            exam_year=goal.exam_year,
            school=goal.school,
            major=goal.major,
            exam_date=exam_date,
            subjects=subjects,
            daily_minutes=profile.daily_minutes,
            learning_level=profile.learning_level,
            weakness=profile.weakness,
            target_score=goal.target_score,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        # Archive existing active plans and compute next version number
        max_version = (
            db.scalar(select(func.max(StudyPlan.version)).where(StudyPlan.user_id == user.id))
            or 0
        )
        next_version = int(max_version) + 1

        active_plans = db.scalars(
            select(StudyPlan).where(
                StudyPlan.user_id == user.id,
                StudyPlan.status == "ACTIVE",
            )
        ).all()
        for old_plan in active_plans:
            old_plan.status = "ARCHIVED"

        # Cancel remaining unfinished tasks from old plans so today's queue stays clean
        old_tasks = db.scalars(
            select(StudyTask).where(
                StudyTask.user_id == user.id,
                StudyTask.status.in_(["PENDING", "IN_PROGRESS", "OVERDUE"]),
            )
        ).all()
        for old_task in old_tasks:
            old_task.status = "RESCHEDULED"

        plan_start = date.today()
        total_weeks = max(len(draft.weeks), 1)
        plan_end = plan_start + timedelta(days=total_weeks * 7 - 1)

        root_meta = {
            "school": goal.school,
            "major": goal.major,
            "exam_year": goal.exam_year,
            "exam_date": exam_date.isoformat(),
            "subjects": subjects,
            "milestones": [m.model_dump() for m in draft.milestones],
            "checklist": draft.checklist,
            "source": source,
            "fallback_reason": fallback_reason,
        }

        root_plan = StudyPlan(
            user_id=user.id,
            goal_id=goal.id,
            plan_type="YEAR",
            parent_id=None,
            version=next_version,
            title=draft.title,
            start_date=plan_start,
            end_date=plan_end,
            status="ACTIVE",
            generated_by=source,
            content_json=json.dumps(root_meta, ensure_ascii=False),
        )
        db.add(root_plan)
        db.flush()

        # Persist PHASE plans
        phase_records: dict[str, StudyPlan] = {}
        for phase in draft.phases:
            if not phase.week_numbers:
                continue
            min_w = min(phase.week_numbers)
            max_w = max(phase.week_numbers)
            p_start = plan_start + timedelta(days=(min_w - 1) * 7)
            p_end = plan_start + timedelta(days=max_w * 7 - 1)
            phase_plan = StudyPlan(
                user_id=user.id,
                goal_id=goal.id,
                plan_type="PHASE",
                parent_id=root_plan.id,
                version=next_version,
                title=phase.title,
                start_date=p_start,
                end_date=p_end,
                status="ACTIVE",
                generated_by=source,
                content_json=json.dumps(
                    {"phase_type": phase.phase_type, "description": phase.description},
                    ensure_ascii=False,
                ),
            )
            db.add(phase_plan)
            db.flush()
            phase_records[phase.phase_type] = phase_plan

        # Build subject lookup map for task linkage
        all_subjects = db.scalars(select(Subject)).all()
        subject_map: dict[str, int] = {}
        for subj in all_subjects:
            subject_map[subj.name.lower()] = subj.id
            subject_map[subj.code.lower()] = subj.id

        # Persist WEEK plans and StudyTask rows
        for week in sorted(draft.weeks, key=lambda item: item.week_number):
            w_start = plan_start + timedelta(days=(week.week_number - 1) * 7)
            w_end = w_start + timedelta(days=6)
            parent_phase = phase_records.get(week.phase_type) or root_plan
            week_plan = StudyPlan(
                user_id=user.id,
                goal_id=goal.id,
                plan_type="WEEK",
                parent_id=parent_phase.id,
                version=next_version,
                title=f"第 {week.week_number} 周计划",
                start_date=w_start,
                end_date=w_end,
                status="ACTIVE",
                generated_by=source,
                content_json=json.dumps(
                    {
                        "week_number": week.week_number,
                        "phase_type": week.phase_type,
                        "weekly_goal": week.weekly_goal,
                    },
                    ensure_ascii=False,
                ),
            )
            db.add(week_plan)
            db.flush()

            for task in week.tasks:
                task_date = w_start + timedelta(days=task.day_offset_in_week)
                deadline_dt = datetime.combine(task_date, dt_time(23, 59, 59), tzinfo=timezone.utc)
                db.add(
                    StudyTask(
                        plan_id=week_plan.id,
                        user_id=user.id,
                        subject_id=_match_subject_id(task.subject_name, subject_map),
                        knowledge_point_id=None,
                        title=task.title,
                        description=f"[{task.subject_name}] {task.description}",
                        estimated_minutes=task.estimated_minutes,
                        scheduled_date=task_date,
                        deadline=deadline_dt,
                        priority=task.priority,
                        status="PENDING",
                    )
                )

        profile.profile_status = "PLAN_GENERATED"

        db.add(
            AgentExecution(
                user_id=user.id,
                execution_type="INITIAL_PLAN",
                input_summary=json.dumps(
                    {
                        "school": goal.school,
                        "major": goal.major,
                        "subjects": subjects,
                        "daily_minutes": profile.daily_minutes,
                        "learning_level": profile.learning_level,
                    },
                    ensure_ascii=False,
                ),
                output_summary=json.dumps(
                    {
                        "plan_id": root_plan.id,
                        "version": next_version,
                        "weeks": len(draft.weeks),
                        "source": source,
                    },
                    ensure_ascii=False,
                ),
                status="SUCCESS" if source == "llm" else "FALLBACK",
                trigger_source=trigger_source,
                latency_ms=latency_ms,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
            )
        )

        db.commit()
        return PlanService.get_plan_by_id(db, user.id, root_plan.id)

    @staticmethod
    def get_current_plan(db: Session, user_id: int) -> Optional[dict[str, Any]]:
        root_plan = db.scalar(
            select(StudyPlan)
            .where(
                StudyPlan.user_id == user_id,
                StudyPlan.plan_type == "YEAR",
                StudyPlan.status == "ACTIVE",
            )
            .order_by(StudyPlan.version.desc(), StudyPlan.id.desc())
        )
        if root_plan is None:
            return None
        return PlanService.get_plan_by_id(db, user_id, root_plan.id)

    @staticmethod
    def get_plan_by_id(db: Session, user_id: int, root_plan_id: int) -> dict[str, Any]:
        root_plan = db.scalar(
            select(StudyPlan).where(
                StudyPlan.id == root_plan_id,
                StudyPlan.user_id == user_id,
                StudyPlan.plan_type == "YEAR",
            )
        )
        if root_plan is None:
            raise HTTPException(status_code=404, detail="请求的计划不存在")

        meta = {}
        try:
            meta = json.loads(root_plan.content_json or "{}")
        except ValueError:
            meta = {}

        phase_plans = db.scalars(
            select(StudyPlan)
            .where(
                StudyPlan.user_id == user_id,
                StudyPlan.parent_id == root_plan.id,
                StudyPlan.plan_type == "PHASE",
            )
            .order_by(StudyPlan.id.asc())
        ).all()

        phase_ids = [p.id for p in phase_plans]
        week_plans = db.scalars(
            select(StudyPlan)
            .where(
                StudyPlan.user_id == user_id,
                StudyPlan.plan_type == "WEEK",
                StudyPlan.parent_id.in_(phase_ids + [root_plan.id]),
            )
            .order_by(StudyPlan.id.asc())
        ).all()

        week_ids = [w.id for w in week_plans]
        tasks = (
            db.scalars(
                select(StudyTask)
                .where(StudyTask.user_id == user_id, StudyTask.plan_id.in_(week_ids))
                .order_by(StudyTask.scheduled_date.asc(), StudyTask.priority.desc(), StudyTask.id.asc())
            ).all()
            if week_ids
            else []
        )

        subject_names = {
            s.id: s.name for s in db.scalars(select(Subject)).all()
        }

        tasks_by_week: dict[int, list[dict[str, Any]]] = {}
        for t in tasks:
            tasks_by_week.setdefault(t.plan_id, []).append(
                {
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "subject_id": t.subject_id,
                    "subject_name": subject_names.get(t.subject_id, "综合"),
                    "estimated_minutes": t.estimated_minutes,
                    "scheduled_date": t.scheduled_date.isoformat() if t.scheduled_date else None,
                    "priority": t.priority,
                    "status": t.status,
                }
            )

        weeks_out = []
        for w in week_plans:
            w_meta = {}
            try:
                w_meta = json.loads(w.content_json or "{}")
            except ValueError:
                w_meta = {}
            w_tasks = tasks_by_week.get(w.id, [])
            weeks_out.append(
                {
                    "id": w.id,
                    "parent_phase_id": w.parent_id,
                    "week_number": w_meta.get("week_number", len(weeks_out) + 1),
                    "phase_type": w_meta.get("phase_type", "FOUNDATION"),
                    "title": w.title,
                    "weekly_goal": w_meta.get("weekly_goal", ""),
                    "start_date": w.start_date.isoformat() if w.start_date else None,
                    "end_date": w.end_date.isoformat() if w.end_date else None,
                    "tasks": w_tasks,
                }
            )

        phases_out = []
        for p in phase_plans:
            p_meta = {}
            try:
                p_meta = json.loads(p.content_json or "{}")
            except ValueError:
                p_meta = {}
            phases_out.append(
                {
                    "id": p.id,
                    "phase_type": p_meta.get("phase_type", "FOUNDATION"),
                    "title": p.title,
                    "description": p_meta.get("description", ""),
                    "start_date": p.start_date.isoformat() if p.start_date else None,
                    "end_date": p.end_date.isoformat() if p.end_date else None,
                    "weeks": [w for w in weeks_out if w["parent_phase_id"] == p.id],
                }
            )

        return {
            "id": root_plan.id,
            "version": root_plan.version,
            "title": root_plan.title,
            "status": root_plan.status,
            "source": root_plan.generated_by,
            "fallback_reason": meta.get("fallback_reason"),
            "start_date": root_plan.start_date.isoformat() if root_plan.start_date else None,
            "end_date": root_plan.end_date.isoformat() if root_plan.end_date else None,
            "school": meta.get("school", ""),
            "major": meta.get("major", ""),
            "exam_year": meta.get("exam_year"),
            "exam_date": meta.get("exam_date"),
            "subjects": meta.get("subjects", []),
            "milestones": meta.get("milestones", []),
            "checklist": meta.get("checklist", []),
            "phases": phases_out,
            "weeks": sorted(weeks_out, key=lambda x: x["week_number"]),
            "created_at": root_plan.created_at.isoformat(),
        }

    @staticmethod
    def list_plan_versions(db: Session, user_id: int) -> list[dict[str, Any]]:
        roots = db.scalars(
            select(StudyPlan)
            .where(StudyPlan.user_id == user_id, StudyPlan.plan_type == "YEAR")
            .order_by(StudyPlan.version.desc(), StudyPlan.id.desc())
        ).all()

        result = []
        for root in roots:
            phase_ids = db.scalars(
                select(StudyPlan.id).where(StudyPlan.parent_id == root.id)
            ).all()
            week_ids = (
                db.scalars(
                    select(StudyPlan.id).where(StudyPlan.parent_id.in_(phase_ids + [root.id]))
                ).all()
            )
            tasks = (
                db.scalars(select(StudyTask).where(StudyTask.plan_id.in_(week_ids))).all()
                if week_ids
                else []
            )
            result.append(
                {
                    "id": root.id,
                    "version": root.version,
                    "title": root.title,
                    "status": root.status,
                    "source": root.generated_by,
                    "start_date": root.start_date.isoformat() if root.start_date else None,
                    "end_date": root.end_date.isoformat() if root.end_date else None,
                    "task_count": len(tasks),
                    "completed_count": sum(1 for t in tasks if t.status == "COMPLETED"),
                    "created_at": root.created_at.isoformat(),
                }
            )
        return result
