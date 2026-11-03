from app.agents.base_agent import BaseAgent
from app.models import ProjectRequest, ProjectResponse, ProjectRecommendation, Milestone

class ProjectAgent(BaseAgent):
    def generate_projects(self, req: ProjectRequest) -> ProjectResponse:
        system_instruction = (
            "You are the Project Recommendation Agent for the Smart Student Success app. "
            "Your task is to recommend high-quality, practical project ideas for students based on their target domain, "
            "difficulty level, preferred tech stack, and scope. "
            "Each recommendation must include a title, description, core features, tech stack list, "
            "implementation milestones, and a complete GitHub-ready README.md template in markdown format."
        )
        
        prompt = (
            f"Generate project recommendations for the '{req.domain}' domain.\n"
            f"Difficulty Level: {req.difficulty}\n"
            f"Preferred Tech Stack: {', '.join(req.tech_stack)}\n"
            f"Scope: {req.project_scope}\n\n"
            "Return the project recommendations strictly matching the response schema."
        )
        
        def fallback():
            # Devise a creative project name and details based on domain
            domain_lower = req.domain.lower()
            stack_str = ", ".join(req.tech_stack)
            domain_labels = {
                "web development": "网页开发",
                "ai & machine learning": "人工智能与机器学习",
                "software engineering": "软件工程",
                "mobile applications": "移动应用",
            }
            domain_name = domain_labels.get(domain_lower, req.domain)
            
            if "ai" in domain_lower or "ml" in domain_lower or "data" in domain_lower:
                p_title = "智析 - 智能学情诊断分析器"
                p_desc = "一个基于智能代理的分析系统，可评估学生的学习记录、作业提交和测验表现，并给出可执行的学习建议。"
                p_features = [
                    "Gemini API 结构化诊断分析引擎",
                    "用于长期跟踪学生成绩的数据库仪表盘",
                    "展示学习速度指标的自定义图表生成器",
                    "为学业导师自动生成 PDF 报告"
                ]
            elif "web" in domain_lower or "app" in domain_lower:
                p_title = "智学空间 - 班级协作工作区"
                p_desc = f"使用 {stack_str} 构建的实时课堂协作空间，支持课堂笔记、学习指南和讨论区。"
                p_features = [
                    "同学之间的实时富文本笔记同步",
                    "按科目组织并支持课件共享的频道与文件夹",
                    "集成在侧边栏工作区中的 AI 聊天助手",
                    "根据笔记生成互动式学习卡片"
                ]
            else:
                p_title = "开发工坊 - 技术作品集优化器"
                p_desc = f"使用 {stack_str} 开发的开发者工具，可分析 GitHub 主页指标、突出项目分类并推荐模板。"
                p_features = [
                    "GitHub API 数据提取与集成",
                    "自动解析并归类技能",
                    "生成简洁的 SVG 作品集徽章",
                    "导出 HTML 与 Markdown 模板"
                ]
                
            readme_md = (
                f"# {p_title}\n\n"
                f"## 项目概览\n"
                f"{p_desc}\n\n"
                f"本项目由 **Smart Student Success Agent** 生成，是针对 **{req.difficulty}** 难度定制的推荐方案，"
                f"使用 **{stack_str}**。\n\n"
                f"## 功能\n"
                + "\n".join([f"- **{feat}**" for feat in p_features]) + "\n\n"
                f"## 快速开始\n\n"
                f"### 环境要求\n"
                f"请确保已安装以下技术的最新版本：`{', '.join(req.tech_stack[:3])}`。\n\n"
                f"### 安装\n"
                f"1. 克隆仓库：\n"
                f"   ```bash\n"
                f"   git clone https://github.com/your-username/{p_title.lower().replace(' ', '-')}.git\n"
                f"   ```\n"
                f"2. 安装依赖：\n"
                f"   ```bash\n"
                f"   npm install  # or pip install -r requirements.txt\n"
                f"   ```\n"
                f"3. 创建 `.env` 文件并配置 API 密钥。\n"
                f"4. 启动开发服务器：\n"
                f"   ```bash\n"
                f"   npm run dev  # or uvicorn main:app --reload\n"
                f"   ```\n\n"
                f"## 许可证\n"
                f"MIT License - 可自由用于学生作品集并进行修改！"
            )
            
            milestones = [
                Milestone(
                    title="第一阶段：环境搭建与界面框架",
                    target_date="里程碑 1",
                    description="初始化仓库、配置 Tailwind 与样式，并构建核心仪表盘页面。"
                ),
                Milestone(
                    title="第二阶段：核心逻辑与 API 集成",
                    target_date="里程碑 2",
                    description="实现后端服务，集成 Gemini API 或数据库接口，并验证响应结果。"
                ),
                Milestone(
                    title="第三阶段：部署与完善",
                    target_date="里程碑 3",
                    description="编写测试、优化响应式布局，并部署到 Vercel 或 Render。"
                )
            ]
            
            project_rec = ProjectRecommendation(
                title=p_title,
                difficulty=req.difficulty,
                description=p_desc,
                key_features=p_features,
                suggested_tech_stack=req.tech_stack,
                implementation_milestones=milestones,
                readme_template=readme_md
            )
            
            # Add a secondary simpler project just to give the student choices
            sec_title = f"{domain_name}作品集入门项目"
            sec_desc = f"一个适合初学者的项目，重点练习使用 {stack_str} 编写模块化代码。"
            sec_features = [
                "清晰的目录结构模板",
                "轻量级静态页面与组件",
                "使用 Local Storage 保存用户设置"
            ]
            
            sec_readme = (
                f"# {sec_title}\n\n"
                f"一个面向{domain_name}学习者的轻量级项目模板，使用 `{stack_str}`。\n"
            )
            
            sec_milestones = [
                Milestone(
                    title="环境搭建与本地存储",
                    target_date="第 1-3 天",
                    description="创建静态页面布局并接入表单输入监听。"
                )
            ]
            
            sec_project = ProjectRecommendation(
                title=sec_title,
                difficulty="Beginner",
                description=sec_desc,
                key_features=sec_features,
                suggested_tech_stack=req.tech_stack[:2],
                implementation_milestones=sec_milestones,
                readme_template=sec_readme
            )
            
            return ProjectResponse(
                projects=[project_rec, sec_project]
            )
            
        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=ProjectResponse,
            fallback_func=fallback
        )
