from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging

from app.models import (
    PlannerRequest, StudyPlan,
    ExamPrepRequest, ExamPrepResponse,
    CareerGuidanceRequest, CareerGuidanceResponse,
    ProjectRequest, ProjectResponse,
    ChatRequest, ChatResponse
)
from app.agents.planner import PlannerAgent
from app.agents.exam_prep import ExamPrepAgent
from app.agents.career import CareerAgent
from app.agents.project import ProjectAgent
from app.agents.base_agent import BaseAgent
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Smart Student Success Agent API",
    description="Backend API for the AI-powered student academic and career success dashboard.",
    version="1.0.0"
)

# Configure CORS so our React frontend can access it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_api_key(x_gemini_api_key: Optional[str] = Header(None)) -> str:
    """
    Extract API key from header or environment variable.
    """
    key = x_gemini_api_key or settings.GEMINI_API_KEY
    return key

@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart Student Success Agent API. Access docs at /docs."}

@app.post("/api/planner", response_model=StudyPlan)
async def generate_study_plan(req: PlannerRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        api_key = get_api_key(x_gemini_api_key)
        agent = PlannerAgent(api_key=api_key)
        return agent.generate_plan(req)
    except Exception as e:
        logger.error(f"Error in planner endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")

@app.post("/api/exam-prep", response_model=ExamPrepResponse)
async def generate_exam_prep(req: ExamPrepRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        api_key = get_api_key(x_gemini_api_key)
        agent = ExamPrepAgent(api_key=api_key)
        return agent.generate_prep_material(req)
    except Exception as e:
        logger.error(f"Error in exam prep endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate exam prep: {str(e)}")

@app.post("/api/career", response_model=CareerGuidanceResponse)
async def generate_career_guidance(req: CareerGuidanceRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        api_key = get_api_key(x_gemini_api_key)
        agent = CareerAgent(api_key=api_key)
        return agent.generate_career_guidance(req)
    except Exception as e:
        logger.error(f"Error in career endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate career guidance: {str(e)}")

@app.post("/api/projects", response_model=ProjectResponse)
async def generate_project_recommendations(req: ProjectRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        api_key = get_api_key(x_gemini_api_key)
        agent = ProjectAgent(api_key=api_key)
        return agent.generate_projects(req)
    except Exception as e:
        logger.error(f"Error in projects endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate project recommendations: {str(e)}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_assistant(req: ChatRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        api_key = get_api_key(x_gemini_api_key)
        agent = BaseAgent(api_key=api_key)
        
        system_instruction = (
            "You are the Academic and Career Mentor Chatbot for the Smart Student Success app. "
            "You help polytechnic students, university students, self-learners, and job seekers "
            "with academic planning, exam strategies, skill development, and portfolio projects. "
            "Be encouraging, highly professional, structured, and clear. "
            "Keep your responses relatively brief (150-250 words) and format key terms in bold. "
            "Always keep the conversation focused on educational and career matters. "
            "If the user asks questions outside this context, politely guide them back."
        )
        
        # Determine current context for better fallback responses
        subject = req.context.get("subject", "") if req.context else ""
        career = req.context.get("career", "") if req.context else ""
        
        def fallback():
            msg = req.message.lower()
            
            # Simple rules for interactive fallback replies
            if "hello" in msg or "hi" in msg:
                reply = (
                    "Hello! I am your **AI Academic & Career Success Assistant**. I'm here to help you: \n\n"
                    "1. Map out personalized weekly **Study Plans**.\n"
                    "2. Generate study guides, MCQ practice quizzes, and checklists for **Exam Prep**.\n"
                    "3. Provide **Career Roadmaps** and analyze skills gaps.\n"
                    "4. Suggest customized **Portfolio Projects** complete with GitHub READMEs.\n\n"
                    "What are you studying today, or what is your dream career?"
                )
                qs = ["How do I create a study plan?", "What projects can I build?", "Explain machine learning."]
            elif "plan" in msg or "study" in msg or "schedule" in msg:
                reply = (
                    "To generate a custom study plan, click on the **Study Planner** page! "
                    "You can enter your subject, exam date, and daily available study hours. "
                    "I will generate a day-by-day checklist calendar. "
                    "Would you like me to summarize study techniques like the **Pomodoro technique** or **Spaced Repetition** here?"
                )
                qs = ["Tell me about Spaced Repetition", "How can I study database systems?", "What are good study habits?"]
            elif "career" in msg or "job" in msg or "intern" in msg:
                reply = (
                    "Planning your career is exciting! Head over to the **Career Guidance** page. "
                    "Input your target role (like *Web Developer* or *AI Engineer*), current skills, and interests. "
                    "I will map out a timeline roadmap and analyze your **skills gaps**.\n\n"
                    "What field are you looking to break into?"
                )
                qs = ["How to become an AI Engineer?", "What skills do I need for software engineering?", "Suggest web development courses."]
            elif "project" in msg or "readme" in msg or "github" in msg:
                reply = (
                    "Building projects is the best way to learn and secure jobs. The **Project Recommendations** page suggests "
                    "beginner-to-advanced project briefs tailored to your tech stack. It even creates a downloadable **GitHub README.md** template.\n\n"
                    "What technology stack do you prefer (e.g. React, Python, FastAPI)?"
                )
                qs = ["Suggest a Python project", "Give me a React portfolio project idea", "What should be in a GitHub README?"]
            else:
                reply = (
                    f"That's a great question! Regarding your query on **{req.message[:30]}...**, "
                    "I suggest structure and consistency in your preparation. Focus on creating modular code or summarizing your terms. "
                    "If you are reviewing a specific subject like " + (f"**{subject}**" if subject else "your courses") + " or aiming for a career like " + (f"**{career}**" if career else "software engineering") + ", "
                    "try using the specific agents on the sidebar for a deeper analysis."
                )
                qs = ["Give me exam prep tips", "What projects help in a resume?", "How to prepare for coding interviews?"]
                
            return reply, qs
            
        reply, suggested_qs = agent.generate_chat_reply(
            history=req.history,
            user_message=req.message,
            system_instruction=system_instruction,
            fallback_func=fallback
        )
        
        return ChatResponse(reply=reply, suggested_questions=suggested_qs)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")
