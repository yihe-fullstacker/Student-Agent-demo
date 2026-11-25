from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base, BigIntPK


def utc_now() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    profile: Mapped[Optional["UserProfile"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    exam_goals: Mapped[list["ExamGoal"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class ExamGoal(Base):
    __tablename__ = "exam_goal"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exam_year: Mapped[int] = mapped_column(Integer, nullable=False)
    school: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    major: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    exam_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    target_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="exam_goals")


class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    daily_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=180)
    learning_level: Mapped[str] = mapped_column(String(20), nullable=False, default="Intermediate")
    subjects_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    weakness: Mapped[str] = mapped_column(Text, nullable=False, default="")
    profile_status: Mapped[str] = mapped_column(String(30), nullable=False, default="UNFILLED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="profile")


class Subject(Base):
    __tablename__ = "subject"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="公共课")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    knowledge_points: Mapped[list["KnowledgePoint"]] = relationship(
        back_populates="subject", cascade="all, delete-orphan"
    )


class KnowledgePoint(Base):
    __tablename__ = "knowledge_point"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("subject.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("knowledge_point.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="Intermediate")
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    subject: Mapped["Subject"] = relationship(back_populates="knowledge_points")


class StudyPlan(Base):
    __tablename__ = "study_plan"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    goal_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("exam_goal.id", ondelete="SET NULL"), nullable=True
    )
    plan_type: Mapped[str] = mapped_column(String(20), nullable=False, default="YEAR")
    parent_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("study_plan.id", ondelete="CASCADE"), nullable=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    generated_by: Mapped[str] = mapped_column(String(20), nullable=False, default="llm")
    content_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class StudyTask(Base):
    __tablename__ = "study_task"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("study_plan.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("subject.id", ondelete="SET NULL"), nullable=True
    )
    knowledge_point_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("knowledge_point.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    scheduled_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class StudyRecord(Base):
    __tablename__ = "study_record"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("study_task.id", ondelete="SET NULL"), index=True, nullable=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    actual_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_status: Mapped[str] = mapped_column(String(20), nullable=False, default="COMPLETED")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class StudyFeedback(Base):
    __tablename__ = "study_feedback"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("study_task.id", ondelete="SET NULL"), nullable=True
    )
    record_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("study_record.id", ondelete="SET NULL"), nullable=True
    )
    self_rating: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    difficulty_feeling: Mapped[str] = mapped_column(String(20), nullable=False, default="MODERATE")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class KnowledgeMastery(Base):
    __tablename__ = "knowledge_mastery"
    __table_args__ = (
        UniqueConstraint("user_id", "knowledge_point_id", name="uq_user_knowledge_point"),
    )

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    knowledge_point_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("knowledge_point.id", ondelete="CASCADE"), index=True, nullable=False
    )
    mastery_level: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    practice_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_weak: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_study_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class AgentExecution(Base):
    __tablename__ = "agent_execution"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="SET NULL"), index=True, nullable=True
    )
    execution_type: Mapped[str] = mapped_column(String(30), nullable=False)
    input_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    output_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SUCCESS")
    trigger_source: Mapped[str] = mapped_column(String(30), nullable=False, default="USER_REQUEST")
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AgentMemory(Base):
    __tablename__ = "agent_memory"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    memory_type: Mapped[str] = mapped_column(String(20), nullable=False, default="LONG_TERM")
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_document"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("subject.id", ondelete="SET NULL"), nullable=True
    )
    source_path: Mapped[str] = mapped_column(String(255), nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class WrongQuestion(Base):
    __tablename__ = "wrong_question"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("subject.id", ondelete="SET NULL"), nullable=True
    )
    knowledge_point_id: Mapped[Optional[int]] = mapped_column(
        BigIntPK, ForeignKey("knowledge_point.id", ondelete="SET NULL"), nullable=True
    )
    topic: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    correct_answer_index: Mapped[int] = mapped_column(Integer, nullable=False)
    user_answer_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    wrong_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    mastered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_wrong_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class ChatMessageRecord(Base):
    __tablename__ = "chat_message"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("user.id", ondelete="CASCADE"), index=True, nullable=False
    )
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False, default="default")
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_by: Mapped[str] = mapped_column(String(20), nullable=False, default="llm")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
