import asyncio
from datetime import date, datetime, timezone
import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import (
    AgentExecution,
    AgentMemory,
    KnowledgeMastery,
    StudyPlan,
    StudyTask,
)

logger = logging.getLogger(__name__)


def run_daily_overdue_scan(db: Session, reference_date: Optional[date] = None) -> int:
    """Scan all users' unfinished tasks scheduled before today and mark them OVERDUE."""
    today = reference_date or date.today()
    candidates = db.scalars(
        select(StudyTask).where(
            StudyTask.scheduled_date.is_not(None),
            StudyTask.scheduled_date < today,
            StudyTask.status.in_(["PENDING", "IN_PROGRESS"]),
        )
    ).all()
    if not candidates:
        return 0
    for task in candidates:
        task.status = "OVERDUE"
    db.commit()
    return len(candidates)


def run_weekly_replan_preanalysis(db: Session, reference_date: Optional[date] = None) -> int:
    """Pre-analyze active plans for users with >=3 overdue tasks or marked weak knowledge points."""
    today = reference_date or date.today()
    active_roots = db.scalars(
        select(StudyPlan).where(
            StudyPlan.plan_type == "YEAR",
            StudyPlan.status == "ACTIVE",
        )
    ).all()

    flagged_users = 0
    seen_users: set[int] = set()
    for root in active_roots:
        if root.user_id in seen_users:
            continue
        seen_users.add(root.user_id)

        overdue_count = len(
            db.scalars(
                select(StudyTask.id).where(
                    StudyTask.user_id == root.user_id,
                    StudyTask.status == "OVERDUE",
                )
            ).all()
        )
        weak_count = len(
            db.scalars(
                select(KnowledgeMastery.id).where(
                    KnowledgeMastery.user_id == root.user_id,
                    KnowledgeMastery.is_weak.is_(True),
                )
            ).all()
        )

        if overdue_count >= 3 or weak_count > 0:
            flagged_users += 1
            summary = (
                f"每周预分析（{today.isoformat()}）：检测到 {overdue_count} 项逾期任务，"
                f"{weak_count} 个薄弱知识点，建议触发 AI 动态调整计划。"
            )
            mem = db.scalar(
                select(AgentMemory).where(
                    AgentMemory.user_id == root.user_id,
                    AgentMemory.memory_type == "SHORT_TERM",
                    AgentMemory.key == "weekly_preanalysis",
                )
            )
            if mem is None:
                db.add(
                    AgentMemory(
                        user_id=root.user_id,
                        memory_type="SHORT_TERM",
                        key="weekly_preanalysis",
                        content=summary,
                        importance=4,
                    )
                )
            else:
                mem.content = summary

            now = datetime.now(timezone.utc)
            db.add(
                AgentExecution(
                    user_id=root.user_id,
                    execution_type="ANALYSIS",
                    input_summary=json.dumps(
                        {"overdue_count": overdue_count, "weak_count": weak_count},
                        ensure_ascii=False,
                    ),
                    output_summary=summary,
                    status="SUCCESS",
                    trigger_source="SCHEDULED",
                    latency_ms=0,
                    started_at=now,
                    finished_at=now,
                )
            )

    if flagged_users > 0:
        db.commit()
    return flagged_users


class BackgroundScheduler:
    """Lightweight asyncio scheduler for daily overdue checks and Sunday pre-analysis."""

    def __init__(self, interval_seconds: int = 3600):
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._last_daily_run: Optional[date] = None
        self._last_weekly_run: Optional[date] = None

    async def _loop(self) -> None:
        while True:
            try:
                today = date.today()
                with SessionLocal() as db:
                    if self._last_daily_run != today:
                        updated = run_daily_overdue_scan(db, today)
                        self._last_daily_run = today
                        logger.info("Scheduled daily overdue scan updated %d tasks", updated)
                    if today.weekday() == 6 and self._last_weekly_run != today:
                        flagged = run_weekly_replan_preanalysis(db, today)
                        self._last_weekly_run = today
                        logger.info("Scheduled weekly preanalysis flagged %d users", flagged)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Background scheduler tick failed: %s", exc)
            await asyncio.sleep(self.interval_seconds)

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task is not None and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None


scheduler = BackgroundScheduler()
