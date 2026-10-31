from datetime import datetime, timedelta
from app.agents.base_agent import BaseAgent
from app.models import PlannerRequest, StudyPlan, WeeklySchedule, DailyPlan, Milestone

class PlannerAgent(BaseAgent):
    def generate_plan(self, req: PlannerRequest) -> StudyPlan:
        system_instruction = (
            "You are the AI Study Planner Agent, a critical component of the Smart Student Success Agent app. "
            "Your objective is to generate highly structured, personalized, and realistic study plans for students. "
            "Given the subject name, target exam date, weak topics, daily hours available, and the student's current proficiency level, "
            "generate a week-by-week plan that leads up to the exam. "
            "Ensure the plan focuses heavily on resolving the weak topics while covering the broader subject. "
            "Provide specific daily study activities (e.g., read, practice, revise, code) with priorities."
        )
        
        prompt = (
            f"Generate a personalized study plan for the subject '{req.subject_name}'.\n"
            f"Target Exam Date: {req.exam_date}\n"
            f"Daily study hours available: {req.daily_hours} hours\n"
            f"Student level: {req.current_level}\n"
            f"Weak topics requiring attention: {', '.join(req.weak_topics)}\n\n"
            "Return the study plan strictly matching the response schema."
        )
        
        def fallback():
            # Calculate weeks until exam
            try:
                exam_dt = datetime.strptime(req.exam_date, "%Y-%m-%d")
                days_until = (exam_dt - datetime.now()).days
                if days_until < 7:
                    weeks = 1
                else:
                    weeks = min(max(1, days_until // 7), 8)
            except Exception:
                weeks = 4  # Default to 4 weeks if date format is invalid or in past
            
            # Generate custom topics based on subject and weak topics
            standard_topics = ["Introduction & Core Fundamentals", "Intermediate Concepts & Structuring", "Advanced Implementation & Practice", "Mock Testing & Final Review"]
            if req.weak_topics:
                # Merge weak topics into the plan topics
                topics_list = [f"Fundamentals & {req.weak_topics[0]}"]
                for wt in req.weak_topics[1:]:
                    topics_list.append(f"Deep dive into {wt}")
                while len(topics_list) < weeks:
                    topics_list.append(f"Comprehensive revision of {req.subject_name}")
                topics_list.append("Practice Exams & Revision")
            else:
                topics_list = standard_topics
                while len(topics_list) < weeks:
                    topics_list.append(f"Extended study of {req.subject_name}")
                topics_list[-1] = "Practice Exams & Revision"
            
            weekly_schedules = []
            for w in range(1, weeks + 1):
                weekly_goal = f"Master {topics_list[w-1]} and complete practice exercises."
                
                days = []
                days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                for i, day in enumerate(days_of_week):
                    priority = "High" if (i % 2 == 0 or any(wt.lower() in topics_list[w-1].lower() for wt in req.weak_topics)) else "Medium"
                    
                    subtopic = f"{topics_list[w-1]} - Section {i+1}"
                    activities = [
                        f"Read study guides or textbooks on {subtopic}",
                        f"Solve 5 practice problems on {subtopic}",
                    ]
                    if priority == "High":
                        activities.append(f"Write summary notes for {subtopic}")
                    
                    days.append(DailyPlan(
                        day_name=day,
                        topic=topics_list[w-1],
                        subtopics=[subtopic],
                        duration_hours=req.daily_hours,
                        priority=priority,
                        activities=activities
                    ))
                
                weekly_schedules.append(WeeklySchedule(
                    week_number=w,
                    weekly_goal=weekly_goal,
                    days=days
                ))
            
            milestones = [
                Milestone(
                    title=f"Week 1 Benchmark",
                    target_date="End of Week 1",
                    description=f"Complete fundamentals of {req.subject_name} and solve introductory assignments."
                )
            ]
            if weeks > 1:
                milestones.append(Milestone(
                    title="Weak Topics Mastery",
                    target_date=f"End of Week {weeks // 2 + 1}",
                    description=f"Complete review and exercises for weak topics: {', '.join(req.weak_topics[:3])}."
                ))
            milestones.append(Milestone(
                title="Exam Readiness",
                target_date="3 Days before Exam",
                description="Achieve >80% on mock quizzes and complete the revision checklist."
            ))
            
            checklist = [
                f"Review summary notes for all key chapters of {req.subject_name}",
                f"Spend extra time reviewing notes on {', '.join(req.weak_topics[:3])}",
                "Take at least two full-length mock exams",
                "Ensure all formulas and definitions are memorized",
                "Review mistake logs from practice quizzes"
            ]
            
            return StudyPlan(
                subject_name=req.subject_name,
                weekly_schedule=weekly_schedules,
                milestones=milestones,
                exam_readiness_checklist=checklist
            )
            
        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=StudyPlan,
            fallback_func=fallback
        )
