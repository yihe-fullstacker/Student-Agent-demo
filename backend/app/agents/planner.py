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
            standard_topics = ["入门与核心基础", "进阶概念与知识结构", "高级实践与项目应用", "模拟测试与最终复习"]
            if req.weak_topics:
                # Merge weak topics into the plan topics
                primary_topic = req.weak_topics[0]
                topics_list = [primary_topic if "基础" in primary_topic else f"{primary_topic} 基础"]
                for wt in req.weak_topics[1:]:
                    topics_list.append(f"深入学习 {wt}")
                while len(topics_list) < weeks:
                    topics_list.append(f"{req.subject_name} 综合复习")
                topics_list.append("练习题与阶段复习")
            else:
                topics_list = standard_topics
                while len(topics_list) < weeks:
                    topics_list.append(f"{req.subject_name} 拓展学习")
                topics_list[-1] = "练习题与阶段复习"
            
            weekly_schedules = []
            for w in range(1, weeks + 1):
                weekly_goal = f"掌握“{topics_list[w-1]}”，并完成配套练习。"
                
                days = []
                days_of_week = ["周一", "周二", "周三", "周四", "周五"]
                for i, day in enumerate(days_of_week):
                    priority = "High" if (i % 2 == 0 or any(wt.lower() in topics_list[w-1].lower() for wt in req.weak_topics)) else "Medium"
                    
                    subtopic = f"{topics_list[w-1]} - 第 {i + 1} 节"
                    activities = [
                        f"阅读 {subtopic} 的学习指南或教材",
                        f"完成 5 道关于 {subtopic} 的练习题",
                    ]
                    if priority == "High":
                        activities.append(f"整理 {subtopic} 的总结笔记")
                    
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
                    title="第一周基准测试",
                    target_date="第一周结束",
                    description=f"完成 {req.subject_name} 的基础内容并解答入门练习。"
                )
            ]
            if weeks > 1:
                milestones.append(Milestone(
                    title="薄弱主题掌握",
                    target_date=f"第 {weeks // 2 + 1} 周结束",
                    description=f"完成以下薄弱主题的复习与练习：{', '.join(req.weak_topics[:3])}。"
                ))
            milestones.append(Milestone(
                title="考试准备度",
                target_date="考试前 3 天",
                description="模拟测验正确率达到 80% 以上，并完成复习清单。"
            ))
            
            checklist = [
                f"复习 {req.subject_name} 各重点章节的总结笔记",
                f"额外安排时间复习以下主题笔记：{', '.join(req.weak_topics[:3])}",
                "至少完成两套完整的模拟考试",
                "确保熟记所有公式和定义",
                "回顾练习测验中的错题记录"
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
