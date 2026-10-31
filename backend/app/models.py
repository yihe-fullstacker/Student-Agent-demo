from pydantic import BaseModel, Field
from typing import List, Optional

# --- Study Planner Models ---
class DailyPlan(BaseModel):
    day_name: str = Field(description="Name of the day (e.g., 'Monday', 'Day 1')")
    topic: str = Field(description="Core topic of the day")
    subtopics: List[str] = Field(description="Subtopics to cover")
    duration_hours: float = Field(description="Duration in hours to study")
    priority: str = Field(description="Priority: 'High', 'Medium', or 'Low'")
    activities: List[str] = Field(description="List of specific study activities")

class WeeklySchedule(BaseModel):
    week_number: int = Field(description="Week index (e.g. 1, 2)")
    weekly_goal: str = Field(description="Core objective for this week")
    days: List[DailyPlan] = Field(description="Daily plans for the week")

class Milestone(BaseModel):
    title: str = Field(description="Milestone title")
    target_date: str = Field(description="Target date or timeline marker (e.g., 'End of Week 2')")
    description: str = Field(description="Details of what should be achieved")

class PlannerRequest(BaseModel):
    subject_name: str
    exam_date: str
    weak_topics: List[str]
    daily_hours: float
    current_level: str  # Beginner, Intermediate, Advanced

class StudyPlan(BaseModel):
    subject_name: str
    weekly_schedule: List[WeeklySchedule]
    milestones: List[Milestone]
    exam_readiness_checklist: List[str]


# --- Exam Prep Models ---
class ImportantQuestion(BaseModel):
    question: str = Field(description="Important exam question")
    sample_answer: str = Field(description="Detailed sample answer or scoring key")

class MCQ(BaseModel):
    id: int = Field(description="Unique question identifier")
    question: str = Field(description="Multiple choice question text")
    options: List[str] = Field(description="List of 4 answer options")
    correct_answer_index: int = Field(description="Index of the correct option (0 to 3)")
    explanation: str = Field(description="Detailed explanation of why this option is correct")

class ExamPrepRequest(BaseModel):
    topic: str
    exam_format: str  # "All", "MCQs", "Questions", "Summary", "Checklist"
    number_of_questions: int = 5
    difficulty: str  # Beginner, Intermediate, Advanced

class ExamPrepResponse(BaseModel):
    topic: str
    summary: str = Field(description="Comprehensive summary of key concepts in Markdown")
    important_questions: List[ImportantQuestion]
    quizzes: List[MCQ]
    checklist: List[str] = Field(description="Revision checklist tasks")


# --- Career Guidance Models ---
class SkillGap(BaseModel):
    skill_name: str = Field(description="Name of the skill")
    status: str = Field(description="Status: 'Acquired' or 'Gap'")
    action_item: str = Field(description="Action item to learn or strengthen this skill")

class RoadmapPhase(BaseModel):
    phase_name: str = Field(description="Phase title (e.g., 'Phase 1: Fundamentals')")
    duration: str = Field(description="Estimated time (e.g., 'Months 1-2')")
    description: str = Field(description="Description of phase goals")
    skills_to_learn: List[str] = Field(description="Specific skills to acquire")
    resources: List[str] = Field(description="Recommended websites, courses, or docs")

class InternshipAdvice(BaseModel):
    role_title: str = Field(description="Target job or internship role")
    required_skills: List[str] = Field(description="Skills required for this role")
    project_focus: str = Field(description="Suggested project focus or portfolio area to stand out")

class CareerGuidanceRequest(BaseModel):
    interests: List[str]
    target_career: str
    current_skills: List[str]
    academic_level: str  # Polytechnic, University, Self-Learner, Job Seeker

class CareerGuidanceResponse(BaseModel):
    target_career: str
    skills_gap_analysis: List[SkillGap]
    roadmap: List[RoadmapPhase]
    internship_recommendations: List[InternshipAdvice]
    industries_hiring: List[str]


# --- Project Recommendation Models ---
class ProjectRecommendation(BaseModel):
    title: str = Field(description="Title of the recommended project")
    difficulty: str = Field(description="Difficulty level")
    description: str = Field(description="Summary of project purpose")
    key_features: List[str] = Field(description="Core functional features")
    suggested_tech_stack: List[str] = Field(description="Tech stack components (languages, frameworks, DBs)")
    implementation_milestones: List[Milestone] = Field(description="Phases of project building")
    readme_template: str = Field(description="A complete GitHub-ready README.md markdown text")

class ProjectRequest(BaseModel):
    domain: str  # AI/ML, Web Development, Software Engineering, etc.
    difficulty: str  # Beginner, Intermediate, Advanced
    tech_stack: List[str]
    project_scope: str  # Individual, Team

class ProjectResponse(BaseModel):
    projects: List[ProjectRecommendation]


# --- Chat Models ---
class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    reply: str
    suggested_questions: List[str]
