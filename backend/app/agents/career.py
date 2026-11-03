from app.agents.base_agent import BaseAgent
from app.models import CareerGuidanceRequest, CareerGuidanceResponse, SkillGap, RoadmapPhase, InternshipAdvice

class CareerAgent(BaseAgent):
    def generate_career_guidance(self, req: CareerGuidanceRequest) -> CareerGuidanceResponse:
        system_instruction = (
            "You are the Career Guidance Agent for the Smart Student Success app. "
            "Your objective is to help students navigate their career aspirations, map out learning paths, "
            "analyze skills gaps, and identify relevant opportunities based on their academic level and interests. "
            "Suggest concrete, actionable roadmaps with resource links and portfolio strategies to succeed in their target career."
        )
        
        prompt = (
            f"Generate a customized career guidance package for a student aiming to become a '{req.target_career}'.\n"
            f"Academic Level: {req.academic_level}\n"
            f"Interests: {', '.join(req.interests)}\n"
            f"Current Skills: {', '.join(req.current_skills)}\n\n"
            "Return the guidance package strictly matching the response schema."
        )
        
        def fallback():
            # Analyze skill gap
            typical_skills = {
                "web developer": ["HTML/CSS", "JavaScript", "React", "Node.js", "SQL", "Git", "REST APIs", "Docker"],
                "data scientist": ["Python", "Pandas/NumPy", "SQL", "Machine Learning", "Data Visualization", "Git", "Statistics", "Cloud Basics"],
                "ai engineer": ["Python", "Deep Learning", "TensorFlow/PyTorch", "LLM Fine-tuning", "Gemini API", "FastAPI", "Vector Databases", "Git"],
                "software engineer": ["Data Structures & Algorithms", "Java/C++/Python", "Git", "System Design", "Unit Testing", "SQL", "Docker", "CI/CD"]
            }
            
            career_lower = req.target_career.lower()
            matched_skills = []
            for role, skills in typical_skills.items():
                if role in career_lower or career_lower in role:
                    matched_skills = skills
                    break
            if not matched_skills:
                matched_skills = ["Python/JavaScript", "Core Programming Logic", "Databases (SQL/NoSQL)", "Git Version Control", "REST API Development", "Cloud Deployment"]
            
            skills_gap = []
            current_skills_lower = [s.lower() for s in req.current_skills]
            for skill in matched_skills:
                is_acquired = any(skill.lower() in cs or cs in skill.lower() for cs in current_skills_lower)
                status = "Acquired" if is_acquired else "Gap"
                action = (
                    "继续通过项目实践巩固这项技能。" if is_acquired
                    else f"通过免费文档学习 {skill} 的基础知识，并完成 2 个小型练习工具。"
                )
                skills_gap.append(SkillGap(
                    skill_name=skill,
                    status=status,
                    action_item=action
                ))
            
            # Roadmap phases
            roadmap = [
                RoadmapPhase(
                    phase_name="第一阶段：基础与版本控制",
                    duration="第 1 个月",
                    description="掌握编程语言语法，并学习团队协作常用的 Git 命令。",
                    skills_to_learn=[s for s in matched_skills[:3]],
                    resources=["W3Schools", "MDN Web Docs", "GitHub Learning Lab"]
                ),
                RoadmapPhase(
                    phase_name="第二阶段：核心工程与框架",
                    duration="第 2-3 个月",
                    description="深入学习领域专用框架、路由设计以及数据库集成。",
                    skills_to_learn=[s for s in matched_skills[3:6]],
                    resources=["Official Documentation", "freeCodeCamp YouTube guides", "Roadmap.sh"]
                ),
                RoadmapPhase(
                    phase_name="第三阶段：作品集与综合项目",
                    duration="第 4 个月",
                    description="构建完整的全栈应用，发布到 GitHub 并部署上线。",
                    skills_to_learn=[s for s in matched_skills[6:]],
                    resources=["Vercel/Render Hosting Docs", "Awesome Open Source lists"]
                )
            ]
            
            # Internship advice
            internships = [
                InternshipAdvice(
                    role_title=f"{req.target_career} 初级实习生",
                    required_skills=matched_skills[:4],
                    project_focus=f"构建一个端到端系统，将 API 与响应式数据库界面结合，并体现你对 {', '.join(req.interests[:2])} 的兴趣。"
                ),
                InternshipAdvice(
                    role_title="开源项目贡献者",
                    required_skills=["Git", "Testing"] + matched_skills[:2],
                    project_focus="为热门 GitHub 项目贡献文档、单元测试和小型功能改进。"
                )
            ]
            
            hiring_industries = [
                "科技初创公司与技术机构",
                "金融机构与金融科技公司",
                "电子商务与零售企业",
                "医疗健康与生物科技技术团队"
            ]
            
            return CareerGuidanceResponse(
                target_career=req.target_career,
                skills_gap_analysis=skills_gap,
                roadmap=roadmap,
                internship_recommendations=internships,
                industries_hiring=hiring_industries
            )
            
        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=CareerGuidanceResponse,
            fallback_func=fallback
        )
