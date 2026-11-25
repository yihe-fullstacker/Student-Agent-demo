from datetime import datetime, timezone
from decimal import Decimal
import json
import time
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.exam_prep import ExamPrepAgent
from app.ai_deps import AIConnection, get_ai_connection
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import (
    AgentExecution,
    AgentMemory,
    KnowledgeMastery,
    KnowledgePoint,
    Subject,
    User,
    WrongQuestion,
)

router = APIRouter(prefix="/api", tags=["Exam & WrongBook"])

WEAK_THRESHOLD = 5


class ExamGenerateRequest(BaseModel):
    subject_id: Optional[int] = None
    knowledge_point_id: Optional[int] = None
    subject_name: str = ""
    topic: str = ""
    difficulty: Literal["Beginner", "Intermediate", "Advanced"] = "Intermediate"
    count: int = Field(5, ge=1, le=10)


class AnswerSubmissionItem(BaseModel):
    question: str = Field(..., min_length=1)
    options: list[str] = Field(..., min_length=2)
    correct_answer_index: int = Field(..., ge=0, le=3)
    user_answer_index: int = Field(..., ge=0, le=3)
    explanation: str = ""


class ExamSubmitRequest(BaseModel):
    subject_id: Optional[int] = None
    knowledge_point_id: Optional[int] = None
    topic: str = Field("", max_length=200)
    answers: list[AnswerSubmissionItem] = Field(..., min_length=1)


class RetryWrongRequest(BaseModel):
    user_answer_index: int = Field(..., ge=0, le=3)


def _update_mastery_and_weakness(
    db: Session,
    *,
    user_id: int,
    knowledge_point_id: Optional[int],
    kp_name: str,
    total_count: int,
    correct_delta: int,
    wrong_delta: int,
) -> bool:
    if knowledge_point_id is None:
        return False

    mastery = db.scalar(
        select(KnowledgeMastery).where(
            KnowledgeMastery.user_id == user_id,
            KnowledgeMastery.knowledge_point_id == knowledge_point_id,
        )
    )
    now = datetime.now(timezone.utc)
    if mastery is None:
        mastery = KnowledgeMastery(
            user_id=user_id,
            knowledge_point_id=knowledge_point_id,
            practice_count=0,
            correct_count=0,
            wrong_count=0,
            is_weak=False,
        )
        db.add(mastery)

    was_weak = bool(mastery.is_weak)
    mastery.practice_count += total_count
    mastery.correct_count += correct_delta
    mastery.wrong_count += wrong_delta
    mastery.last_study_at = now
    if mastery.practice_count > 0:
        ratio = (mastery.correct_count / mastery.practice_count) * 100
        mastery.mastery_level = Decimal(f"{ratio:.2f}")

    newly_marked_weak = False
    if mastery.wrong_count >= WEAK_THRESHOLD:
        mastery.is_weak = True
        if not was_weak:
            newly_marked_weak = True

        mem_key = f"kp_{knowledge_point_id}"
        mem = db.scalar(
            select(AgentMemory).where(
                AgentMemory.user_id == user_id,
                AgentMemory.memory_type == "WEAKNESS",
                AgentMemory.key == mem_key,
            )
        )
        mem_content = f"知识点「{kp_name}」累计错题 {mastery.wrong_count} 次，已自动标记为薄弱环节，需在计划重排时优先加量复习。"
        if mem is None:
            db.add(
                AgentMemory(
                    user_id=user_id,
                    memory_type="WEAKNESS",
                    key=mem_key,
                    content=mem_content,
                    importance=5,
                )
            )
        else:
            mem.content = mem_content

    return newly_marked_weak


@router.post("/exam/generate")
def generate_kaoyan_exam(
    payload: ExamGenerateRequest,
    ai: AIConnection = Depends(get_ai_connection),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate kaoyan MCQs for a chosen subject & knowledge point."""
    subject_obj = db.get(Subject, payload.subject_id) if payload.subject_id else None
    kp_obj = (
        db.get(KnowledgePoint, payload.knowledge_point_id)
        if payload.knowledge_point_id
        else None
    )
    if kp_obj is not None and subject_obj is None:
        subject_obj = db.get(Subject, kp_obj.subject_id)

    subject_name = (
        subject_obj.name
        if subject_obj
        else (payload.subject_name.strip() or "考研综合")
    )
    kp_name = kp_obj.name if kp_obj else (payload.topic.strip() or subject_name)

    started_at = datetime.now(timezone.utc)
    t0 = time.monotonic()
    agent = ExamPrepAgent(api_key=ai.api_key, base_url=ai.base_url, model=ai.model)
    questions, source, fallback_reason = agent.generate_kaoyan_quiz(
        subject_name=subject_name,
        knowledge_point_name=kp_name,
        difficulty=payload.difficulty,
        count=payload.count,
    )
    latency_ms = int((time.monotonic() - t0) * 1000)

    db.add(
        AgentExecution(
            user_id=current_user.id,
            execution_type="EXAM",
            input_summary=json.dumps(
                {
                    "subject": subject_name,
                    "knowledge_point": kp_name,
                    "difficulty": payload.difficulty,
                    "count": payload.count,
                },
                ensure_ascii=False,
            ),
            output_summary=json.dumps(
                {"generated": len(questions), "source": source},
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
        "topic": f"{subject_name} · {kp_name}",
        "subject_id": subject_obj.id if subject_obj else payload.subject_id,
        "knowledge_point_id": kp_obj.id if kp_obj else payload.knowledge_point_id,
        "source": source,
        "fallback_reason": fallback_reason,
        "questions": [q.model_dump() for q in questions],
    }


@router.post("/exam/submit")
def submit_kaoyan_exam(
    payload: ExamSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grade submitted answers, store wrong questions, and update knowledge mastery."""
    kp_obj = (
        db.get(KnowledgePoint, payload.knowledge_point_id)
        if payload.knowledge_point_id
        else None
    )
    resolved_subject_id = payload.subject_id or (kp_obj.subject_id if kp_obj else None)
    kp_name = kp_obj.name if kp_obj else (payload.topic or "专项练习")

    now = datetime.now(timezone.utc)
    correct_count = 0
    wrong_saved_count = 0
    details = []

    for idx, ans in enumerate(payload.answers, start=1):
        is_correct = ans.user_answer_index == ans.correct_answer_index
        if is_correct:
            correct_count += 1
        else:
            wrong_saved_count += 1
            existing = db.scalar(
                select(WrongQuestion).where(
                    WrongQuestion.user_id == current_user.id,
                    WrongQuestion.question == ans.question,
                )
            )
            if existing is None:
                db.add(
                    WrongQuestion(
                        user_id=current_user.id,
                        subject_id=resolved_subject_id,
                        knowledge_point_id=payload.knowledge_point_id,
                        topic=payload.topic or kp_name,
                        question=ans.question,
                        options_json=json.dumps(ans.options, ensure_ascii=False),
                        correct_answer_index=ans.correct_answer_index,
                        user_answer_index=ans.user_answer_index,
                        explanation=ans.explanation,
                        wrong_count=1,
                        mastered=False,
                        last_wrong_at=now,
                    )
                )
            else:
                existing.wrong_count += 1
                existing.user_answer_index = ans.user_answer_index
                existing.mastered = False
                existing.last_wrong_at = now

        details.append(
            {
                "index": idx,
                "question": ans.question,
                "is_correct": is_correct,
                "correct_answer_index": ans.correct_answer_index,
                "user_answer_index": ans.user_answer_index,
                "explanation": ans.explanation,
            }
        )

    total = len(payload.answers)
    wrong_delta = total - correct_count
    newly_marked_weak = _update_mastery_and_weakness(
        db,
        user_id=current_user.id,
        knowledge_point_id=payload.knowledge_point_id,
        kp_name=kp_name,
        total_count=total,
        correct_delta=correct_count,
        wrong_delta=wrong_delta,
    )

    db.commit()

    accuracy_rate = round((correct_count / total) * 100, 1) if total else 0.0
    return {
        "total_count": total,
        "correct_count": correct_count,
        "wrong_count": wrong_delta,
        "score": round(accuracy_rate),
        "accuracy_rate": accuracy_rate,
        "wrong_saved_count": wrong_saved_count,
        "newly_marked_weak": newly_marked_weak,
        "details": details,
    }


@router.get("/wrong/list")
def list_wrong_questions(
    subject_id: Optional[int] = Query(None),
    include_mastered: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return wrong questions for the current user."""
    stmt = select(WrongQuestion).where(WrongQuestion.user_id == current_user.id)
    if subject_id is not None:
        stmt = stmt.where(WrongQuestion.subject_id == subject_id)
    if not include_mastered:
        stmt = stmt.where(WrongQuestion.mastered.is_(False))

    items = db.scalars(stmt.order_by(WrongQuestion.last_wrong_at.desc(), WrongQuestion.id.desc())).all()
    subject_names = {s.id: s.name for s in db.scalars(select(Subject)).all()}
    kp_names = {k.id: k.name for k in db.scalars(select(KnowledgePoint)).all()}

    result = []
    for w in items:
        try:
            options = json.loads(w.options_json or "[]")
        except ValueError:
            options = []
        result.append(
            {
                "id": w.id,
                "subject_id": w.subject_id,
                "subject_name": subject_names.get(w.subject_id, "综合") if w.subject_id else "综合",
                "knowledge_point_id": w.knowledge_point_id,
                "knowledge_point_name": kp_names.get(w.knowledge_point_id, "") if w.knowledge_point_id else "",
                "topic": w.topic,
                "question": w.question,
                "options": options,
                "correct_answer_index": w.correct_answer_index,
                "user_answer_index": w.user_answer_index,
                "explanation": w.explanation,
                "wrong_count": w.wrong_count,
                "mastered": w.mastered,
                "last_wrong_at": w.last_wrong_at.isoformat(),
            }
        )
    return {"wrong_questions": result}


@router.post("/wrong/{wrong_id}/retry")
def retry_wrong_question(
    wrong_id: int,
    payload: RetryWrongRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retry a wrong question; mark as mastered if answered correctly."""
    item = db.scalar(
        select(WrongQuestion).where(
            WrongQuestion.id == wrong_id,
            WrongQuestion.user_id == current_user.id,
        )
    )
    if item is None:
        raise HTTPException(status_code=404, detail="错题记录不存在")

    is_correct = payload.user_answer_index == item.correct_answer_index
    item.user_answer_index = payload.user_answer_index
    if is_correct:
        item.mastered = True
    else:
        item.wrong_count += 1
        item.mastered = False
        item.last_wrong_at = datetime.now(timezone.utc)

    kp_obj = db.get(KnowledgePoint, item.knowledge_point_id) if item.knowledge_point_id else None
    newly_marked_weak = _update_mastery_and_weakness(
        db,
        user_id=current_user.id,
        knowledge_point_id=item.knowledge_point_id,
        kp_name=kp_obj.name if kp_obj else item.topic,
        total_count=1,
        correct_delta=1 if is_correct else 0,
        wrong_delta=0 if is_correct else 1,
    )

    db.commit()
    return {
        "id": item.id,
        "is_correct": is_correct,
        "mastered": item.mastered,
        "wrong_count": item.wrong_count,
        "correct_answer_index": item.correct_answer_index,
        "explanation": item.explanation,
        "newly_marked_weak": newly_marked_weak,
    }
