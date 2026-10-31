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
                    "Keep building projects to reinforce this skill." if is_acquired 
                    else f"Learn the basics of {skill} through free documentation and build 2 small practice tools."
                )
                skills_gap.append(SkillGap(
                    skill_name=skill,
                    status=status,
                    action_item=action
                ))
            
            # Roadmap phases
            roadmap = [
                RoadmapPhase(
                    phase_name="Phase 1: Foundations & Version Control",
                    duration="Month 1",
                    description="Master language syntax and learn collaborative git commands.",
                    skills_to_learn=[s for s in matched_skills[:3]],
                    resources=["W3Schools", "MDN Web Docs", "GitHub Learning Lab"]
                ),
                RoadmapPhase(
                    phase_name="Phase 2: Core Engineering & Frameworks",
                    duration="Months 2-3",
                    description="Deep dive into domain-specific frameworks, routing, and database integrations.",
                    skills_to_learn=[s for s in matched_skills[3:6]],
                    resources=["Official Documentation", "freeCodeCamp YouTube guides", "Roadmap.sh"]
                ),
                RoadmapPhase(
                    phase_name="Phase 3: Portfolio Projects & Capstones",
                    duration="Month 4",
                    description="Build full-stack end-to-end applications to host on GitHub and deploy live.",
                    skills_to_learn=[s for s in matched_skills[6:]],
                    resources=["Vercel/Render Hosting Docs", "Awesome Open Source lists"]
                )
            ]
            
            # Internship advice
            internships = [
                InternshipAdvice(
                    role_title=f"Junior {req.target_career} Intern",
                    required_skills=matched_skills[:4],
                    project_focus=f"Build an end-to-end system integrating APIs with a responsive database interface reflecting interests in {', '.join(req.interests[:2])}."
                ),
                InternshipAdvice(
                    role_title="Open Source Contributor",
                    required_skills=["Git", "Testing"] + matched_skills[:2],
                    project_focus="Contribute documentation, unit tests, and minor feature updates to trending GitHub projects."
                )
            ]
            
            hiring_industries = [
                "Tech Startups & Agencies",
                "Financial Institutions & FinTech",
                "E-Commerce & Retail",
                "Healthcare & BioTech Tech Teams"
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
