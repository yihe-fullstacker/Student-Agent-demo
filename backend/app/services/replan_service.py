from datetime import date, datetime, time as dt_time, timedelta, timezone
import json
import time
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.planner import PlannerAgent
from app.ai_deps import AIConnection
from app.db.models import (
    AgentExecution,
    AgentMemory,
    ExamGoal,
    KnowledgeMastery,
    KnowledgePoint,
    StudyFeedback,
    StudyPlan,
    StudyTask,
    Subject,
    User,
    UserProfile,
)
from app.routers.task import mark_overdue_tasks
from app.services.plan_service import PlanService


class ReplanService:
    """Service layer for AI-driven dynamic plan adjustment and version diffing."""

    @staticmethod
    def replan(
        db: Session,
        user: User,
        ai: AIConnection,
        reason: str = "",
        trigger_source: str = "USER_REQUEST",
    ) -> dict[str, Any]:
        today = date.today()
        mark_overdue_tasks(db, user.id, today)

        old_root = db.scalar(
            select(StudyPlan)
            .where(
                StudyPlan.user_id == user.id,
                StudyPlan.plan_type == "YEAR",
                StudyPlan.status == "ACTIVE",
            )
            .order_by(StudyPlan.version.desc(), StudyPlan.id.desc())
        )
        if old_root is None:
            raise HTTPException(
                status_code=400,
                detail="当前没有生效中的学习计划，请先生成初始学习计划。",
            )

        profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
        goal = db.scalar(
            select(ExamGoal)
            .where(ExamGoal.user_id == user.id, ExamGoal.status == "ACTIVE")
            .order_by(ExamGoal.id.desc())
        )
        daily_minutes = profile.daily_minutes if profile and profile.daily_minutes > 0 else 180
        school = goal.school if goal else "目标院校"
        major = goal.major if goal else "目标专业"

        # Gather active tasks from the current plan tree
        old_phase_ids = db.scalars(
            select(StudyPlan.id).where(StudyPlan.parent_id == old_root.id)
        ).all()
        old_week_ids = db.scalars(
            select(StudyPlan.id).where(StudyPlan.parent_id.in_(old_phase_ids + [old_root.id]))
        ).all()
        old_tasks = (
            db.scalars(
                select(StudyTask)
                .where(StudyTask.user_id == user.id, StudyTask.plan_id.in_(old_week_ids))
                .order_by(StudyTask.scheduled_date.asc(), StudyTask.priority.desc(), StudyTask.id.asc())
            ).all()
            if old_week_ids
            else []
        )

        unfinished_tasks = [
            t for t in old_tasks if t.status in ("PENDING", "IN_PROGRESS", "OVERDUE")
        ]
        overdue_tasks = [t for t in unfinished_tasks if t.status == "OVERDUE"]

        # Gather weakness signals from KnowledgeMastery + UserProfile
        weak_masteries = db.scalars(
            select(KnowledgeMastery).where(
                KnowledgeMastery.user_id == user.id,
                KnowledgeMastery.is_weak.is_(True),
            )
        ).all()
        kp_names = {k.id: k.name for k in db.scalars(select(KnowledgePoint)).all()}
        weak_topics = [
            kp_names[m.knowledge_point_id]
            for m in weak_masteries
            if m.knowledge_point_id in kp_names
        ]
        if profile and profile.weakness:
            for item in profile.weakness.replace("，", ",").split(","):
                cleaned = item.strip()
                if cleaned and cleaned not in weak_topics:
                    weak_topics.append(cleaned)

        hard_feedbacks_rows = db.scalars(
            select(StudyFeedback)
            .where(
                StudyFeedback.user_id == user.id,
                (StudyFeedback.self_rating <= 2) | (StudyFeedback.difficulty_feeling == "HARD"),
            )
            .order_by(StudyFeedback.id.desc())
            .limit(5)
        ).all()
        hard_feedbacks = [f.note for f in hard_feedbacks_rows if f.note]

        started_at = datetime.now(timezone.utc)
        t0 = time.monotonic()
        agent = PlannerAgent(api_key=ai.api_key, base_url=ai.base_url, model=ai.model)
        strategy, source, fallback_reason = agent.generate_replan_strategy(
            school=school,
            major=major,
            overdue_count=len(overdue_tasks),
            pending_count=len(unfinished_tasks),
            weak_topics=weak_topics,
            hard_feedbacks=hard_feedbacks,
            user_reason=reason,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        # Archive old plans and mark unfinished tasks RESCHEDULED
        active_plans = db.scalars(
            select(StudyPlan).where(
                StudyPlan.user_id == user.id,
                StudyPlan.status == "ACTIVE",
            )
        ).all()
        for p in active_plans:
            p.status = "ARCHIVED"

        for t in unfinished_tasks:
            t.status = "RESCHEDULED"

        max_version = (
            db.scalar(select(func.max(StudyPlan.version)).where(StudyPlan.user_id == user.id))
            or old_root.version
        )
        next_version = int(max_version) + 1

        try:
            old_meta = json.loads(old_root.content_json or "{}")
        except ValueError:
            old_meta = {}

        # Build prioritized rescheduled task queue: weak-boost -> overdue -> remaining unfinished
        queue_items: list[dict[str, Any]] = []
        added_weak_count = 0
        boost_topics = strategy.weak_boost_topics or weak_topics[:2]
        for topic in boost_topics[:3]:
            added_weak_count += 1
            queue_items.append(
                {
                    "subject_id": None,
                    "knowledge_point_id": None,
                    "title": f"[薄弱强化] 专项突破：{topic}"[:180],
                    "description": f"根据刷题错题与薄弱诊断自动加量：{topic} 核心概念复盘 + 专项巩固练习。",
                    "estimated_minutes": min(60, max(30, daily_minutes // 3)),
                    "priority": 3,
                }
            )

        # Sort overdue first, then high priority
        sorted_unfinished = sorted(
            unfinished_tasks,
            key=lambda x: (0 if x.status == "OVERDUE" or x in overdue_tasks else 1, -x.priority, x.id),
        )
        for t in sorted_unfinished:
            is_overdue = t in overdue_tasks
            is_weak_match = any(wt.lower() in (t.title + " " + t.description).lower() for wt in weak_topics)
            new_priority = 3 if (is_overdue or is_weak_match) else t.priority
            queue_items.append(
                {
                    "subject_id": t.subject_id,
                    "knowledge_point_id": t.knowledge_point_id,
                    "title": f"[顺延重排] {t.title}"[:180] if is_overdue and not t.title.startswith("[顺延重排]") else t.title,
                    "description": t.description,
                    "estimated_minutes": t.estimated_minutes,
                    "priority": new_priority,
                }
            )

        # Allocate scheduled dates respecting daily_minutes capacity (at least 1 task/day)
        scheduled_buckets: list[tuple[date, list[dict[str, Any]]]] = []
        cur_date = today
        cur_day_items: list[dict[str, Any]] = []
        cur_day_mins = 0
        for item in queue_items:
            if cur_day_items and cur_day_mins + item["estimated_minutes"] > daily_minutes:
                scheduled_buckets.append((cur_date, cur_day_items))
                cur_date = cur_date + timedelta(days=1)
                cur_day_items = []
                cur_day_mins = 0
            cur_day_items.append(item)
            cur_day_mins += item["estimated_minutes"]
        if cur_day_items:
            scheduled_buckets.append((cur_date, cur_day_items))

        total_days = max(1, (scheduled_buckets[-1][0] - today).days + 1) if scheduled_buckets else 7
        total_weeks = min(16, max(1, (total_days + 6) // 7))
        plan_end = today + timedelta(days=total_weeks * 7 - 1)

        new_meta = {
            **old_meta,
            "source": source,
            "fallback_reason": fallback_reason,
            "previous_plan_id": old_root.id,
            "replan_summary": strategy.summary,
            "pace_adjustment": strategy.pace_adjustment,
            "recommendations": strategy.recommendations,
        }

        new_root = StudyPlan(
            user_id=user.id,
            goal_id=goal.id if goal else old_root.goal_id,
            plan_type="YEAR",
            parent_id=None,
            version=next_version,
            title=f"{school} {major} · 动态调整规划 v{next_version}",
            start_date=today,
            end_date=plan_end,
            status="ACTIVE",
            generated_by=source,
            content_json=json.dumps(new_meta, ensure_ascii=False),
        )
        db.add(new_root)
        db.flush()

        phase_plan = StudyPlan(
            user_id=user.id,
            goal_id=new_root.goal_id,
            plan_type="PHASE",
            parent_id=new_root.id,
            version=next_version,
            title="动态重排强化阶段",
            start_date=today,
            end_date=plan_end,
            status="ACTIVE",
            generated_by=source,
            content_json=json.dumps(
                {"phase_type": "ENHANCEMENT", "description": strategy.summary},
                ensure_ascii=False,
            ),
        )
        db.add(phase_plan)
        db.flush()

        week_records: dict[int, StudyPlan] = {}
        for w in range(1, total_weeks + 1):
            w_start = today + timedelta(days=(w - 1) * 7)
            w_end = w_start + timedelta(days=6)
            wp = StudyPlan(
                user_id=user.id,
                goal_id=new_root.goal_id,
                plan_type="WEEK",
                parent_id=phase_plan.id,
                version=next_version,
                title=f"第 {w} 周（重排）",
                start_date=w_start,
                end_date=w_end,
                status="ACTIVE",
                generated_by=source,
                content_json=json.dumps(
                    {
                        "week_number": w,
                        "phase_type": "ENHANCEMENT",
                        "weekly_goal": strategy.pace_adjustment,
                    },
                    ensure_ascii=False,
                ),
            )
            db.add(wp)
            db.flush()
            week_records[w] = wp

        high_priority_count = 0
        for bucket_date, items in scheduled_buckets:
            w_idx = min(total_weeks, max(1, ((bucket_date - today).days // 7) + 1))
            target_week = week_records[w_idx]
            deadline_dt = datetime.combine(bucket_date, dt_time(23, 59, 59), tzinfo=timezone.utc)
            for item in items:
                if item["priority"] == 3:
                    high_priority_count += 1
                db.add(
                    StudyTask(
                        plan_id=target_week.id,
                        user_id=user.id,
                        subject_id=item["subject_id"],
                        knowledge_point_id=item["knowledge_point_id"],
                        title=item["title"],
                        description=item["description"],
                        estimated_minutes=item["estimated_minutes"],
                        scheduled_date=bucket_date,
                        deadline=deadline_dt,
                        priority=item["priority"],
                        status="PENDING",
                    )
                )

        if profile is not None:
            profile.profile_status = "PLAN_ADJUSTED"

        db.add(
            AgentMemory(
                user_id=user.id,
                memory_type="LONG_TERM",
                key=f"replan_v{next_version}",
                content=strategy.summary,
                importance=4,
            )
        )
        db.add(
            AgentExecution(
                user_id=user.id,
                execution_type="REPLAN",
                input_summary=json.dumps(
                    {
                        "old_version": old_root.version,
                        "overdue_count": len(overdue_tasks),
                        "weak_topics": weak_topics,
                    },
                    ensure_ascii=False,
                ),
                output_summary=json.dumps(
                    {
                        "new_plan_id": new_root.id,
                        "new_version": next_version,
                        "rescheduled_count": len(unfinished_tasks),
                        "added_weak_tasks_count": added_weak_count,
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
        new_plan = PlanService.get_plan_by_id(db, user.id, new_root.id)
        return {
            "plan": new_plan,
            "strategy": strategy.model_dump(),
            "source": source,
            "diff_summary": {
                "previous_version": old_root.version,
                "new_version": next_version,
                "rescheduled_count": len(unfinished_tasks),
                "overdue_cleared_count": len(overdue_tasks),
                "added_weak_tasks_count": added_weak_count,
                "high_priority_count": high_priority_count,
            },
        }

    @staticmethod
    def compare_versions(
        db: Session,
        user_id: int,
        old_id: int | None = None,
        new_id: int | None = None,
    ) -> dict[str, Any]:
        roots = db.scalars(
            select(StudyPlan)
            .where(StudyPlan.user_id == user_id, StudyPlan.plan_type == "YEAR")
            .order_by(StudyPlan.version.desc(), StudyPlan.id.desc())
        ).all()

        if len(roots) < 2:
            raise HTTPException(status_code=400, detail="至少需要两个计划版本才能进行差异对比")

        new_root = next((r for r in roots if r.id == new_id), roots[0]) if new_id else roots[0]
        old_root = next((r for r in roots if r.id == old_id), roots[1]) if old_id else roots[1]

        def summarize(root: StudyPlan) -> dict[str, Any]:
            phase_ids = db.scalars(select(StudyPlan.id).where(StudyPlan.parent_id == root.id)).all()
            week_ids = db.scalars(
                select(StudyPlan.id).where(StudyPlan.parent_id.in_(phase_ids + [root.id]))
            ).all()
            tasks = (
                db.scalars(select(StudyTask).where(StudyTask.plan_id.in_(week_ids))).all()
                if week_ids
                else []
            )
            subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}
            by_subject: dict[str, int] = {}
            for t in tasks:
                label = subject_names.get(t.subject_id, "综合") if t.subject_id else "综合"
                by_subject[label] = by_subject.get(label, 0) + 1
            try:
                meta = json.loads(root.content_json or "{}")
            except ValueError:
                meta = {}
            return {
                "id": root.id,
                "version": root.version,
                "title": root.title,
                "status": root.status,
                "source": root.generated_by,
                "total_tasks": len(tasks),
                "high_priority_tasks": sum(1 for t in tasks if t.priority == 3),
                "completed_tasks": sum(1 for t in tasks if t.status == "COMPLETED"),
                "rescheduled_tasks": sum(1 for t in tasks if t.status == "RESCHEDULED"),
                "weak_boost_tasks": sum(1 for t in tasks if "[薄弱强化]" in t.title),
                "replan_summary": meta.get("replan_summary", ""),
                "by_subject": by_subject,
            }

        old_summary = summarize(old_root)
        new_summary = summarize(new_root)
        return {
            "old_version": old_summary,
            "new_version": new_summary,
            "delta": {
                "total_tasks_diff": new_summary["total_tasks"] - old_summary["total_tasks"],
                "high_priority_diff": new_summary["high_priority_tasks"] - old_summary["high_priority_tasks"],
                "weak_boost_added": new_summary["weak_boost_tasks"],
            },
        }
