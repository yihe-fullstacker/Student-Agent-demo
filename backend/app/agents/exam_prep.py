from app.agents.base_agent import BaseAgent
from app.models import ExamPrepRequest, ExamPrepResponse, ImportantQuestion, MCQ

class ExamPrepAgent(BaseAgent):
    def generate_prep_material(self, req: ExamPrepRequest) -> ExamPrepResponse:
        system_instruction = (
            "You are the Exam Preparation Agent for the Smart Student Success app. "
            "Your task is to generate comprehensive and highly useful study summaries, important exam questions with detailed answers, "
            "and multiple-choice quizzes with options, correct answers, and explanations. "
            "The generated content must be appropriate for the student's level (Beginner/Intermediate/Advanced) and "
            "specifically address the topic provided."
        )
        
        prompt = (
            f"Generate exam preparation materials for the topic '{req.topic}'.\n"
            f"Difficulty Level: {req.difficulty}\n"
            f"Requested Format focus: {req.exam_format}\n"
            f"Number of quiz questions needed: {req.number_of_questions}\n\n"
            "Return the material strictly matching the response schema."
        )
        
        def fallback():
            # Create a high-quality Markdown summary based on the topic
            summary_content = (
                f"# 学习概要：{req.topic}（{req.difficulty} 难度）\n\n"
                f"## 1. 知识概览与核心概念\n"
                f"本复习概要围绕 **{req.topic}** 的核心知识展开，内容适合 {req.difficulty} 阶段的学习者。"
                f"掌握这些内容是通过考试的关键。\n\n"
                f"## 2. 关键术语与定义\n"
                f"- **核心组成**：定义系统结构的基础要素。\n"
                f"- **优化**：用于提升效率或准确性的方法。\n"
                f"- **验证**：使用独立数据集或基准进行测试，以确认模型能够泛化。\n\n"
                f"## 3. 重点分析\n"
                f"考试中讨论 {req.topic} 时，建议先说明理论定义，再给出图示或公式，"
                f"最后分析实际应用和边界情况，例如误差阈值与可扩展性限制。\n\n"
                f"## 4. 常用公式与经验规则\n"
                f"* *80/20 法则*：该领域约 80% 的问题通常来自 20% 的系统配置。\n"
                f"* *准确性指标*：比较真正例与假正例，判断系统性能是否可靠。"
            )
            
            # Generate important questions
            important_questions = [
                ImportantQuestion(
                    question=f"说明 {req.topic} 的主要用途，并列出三个实际应用场景。",
                    sample_answer=(
                        f"{req.topic} 的主要用途是帮助系统分析数据、解决任务并优化工作流程。"
                        "三个典型应用包括：\n"
                        "1. 自动化决策支持系统。\n"
                        "2. 模式识别与分类。\n"
                        "3. 可扩展基础设施中的资源分配与成本优化。"
                    )
                ),
                ImportantQuestion(
                    question=f"实施 {req.topic} 时主要会遇到哪些挑战或瓶颈？应如何缓解？",
                    sample_answer=(
                        f"{req.topic} 的主要挑战包括计算复杂度高、数据质量问题以及模型泛化失败（过拟合）。\n"
                        "缓解方式：\n"
                        "- 使用 *降维* 降低计算开销。\n"
                        "- 通过 *交叉验证* 和正则化改善泛化能力。\n"
                        "- 建立 *预处理流程* 处理缺失值并统一特征尺度。"
                    )
                )
            ]
            
            # Generate custom MCQs based on the topic
            mcqs = [
                MCQ(
                    id=1,
                    question=f"以下哪一项最准确地描述了 {req.topic} 的主要目标？",
                    options=[
                        "在去中心化数据库中存储海量文件",
                        "从模式中提取有效信息、自动执行操作或进行预测",
                        "使用层叠样式表设计用户界面",
                        "仅通过负载均衡器优化网络请求"
                    ],
                    correct_answer_index=1,
                    explanation=f"{req.topic} 的核心是从数据中提取模式并支持自动化决策。其他选项分别对应数据存储、网页设计或网络负载均衡。"
                ),
                MCQ(
                    id=2,
                    question="在系统评估中，过拟合（Overfitting）意味着什么？",
                    options=[
                        "模型在未见数据上表现很好，但在训练数据上表现很差",
                        "模型在训练集和测试集上表现都很差",
                        "模型过度记住了训练数据细节，无法泛化到新的测试数据",
                        "模型运行速度太快，无法处理大型数据库"
                    ],
                    correct_answer_index=2,
                    explanation="过拟合是指模型过度贴合训练数据甚至记住了噪声，导致其在新数据上的性能明显下降。"
                ),
                MCQ(
                    id=3,
                    question=f"在严重类别不平衡的情况下，评估 {req.topic} 性能时最应关注哪个指标？",
                    options=[
                        "简单的分类准确率",
                        "F1-Score（精确率与召回率）",
                        "毫秒级执行时间",
                        "编写的代码行数"
                    ],
                    correct_answer_index=1,
                    explanation="在类别不平衡的数据集中，单一准确率容易产生误导，例如始终预测多数类也可能获得较高分数。F1-Score 能平衡精确率与召回率，更真实地反映模型表现。"
                )
            ]
            
            # Fill up to the requested number of questions dynamically
            while len(mcqs) < req.number_of_questions:
                q_id = len(mcqs) + 1
                mcqs.append(MCQ(
                    id=q_id,
                    question=f"在生产环境中分析 {req.topic} 时，以下哪项是标准的最佳实践？",
                    options=[
                        "不编写单元测试、不验证数据质量，直接部署代码",
                        "建立完善的日志记录、验证输入数据并监控性能漂移",
                        "删除全部历史日志以节省磁盘空间",
                        "将所有代码写入一个巨大的文件，不采用模块化结构"
                    ],
                    correct_answer_index=1,
                    explanation="生产环境需要严格的监控、输入验证和日志记录，以便追踪错误并及时应对数据漂移。"
                ))
            
            # Revision checklist
            checklist = [
                f"梳理 {req.topic} 的理论基础",
                "熟记关键公式与架构结构",
                "理解速度、准确率和复杂度之间的取舍",
                "先自行作答，再查看选项，完成至少 5 道选择题",
                "整理一页只包含图表和关键词的速查表"
            ]
            
            return ExamPrepResponse(
                topic=req.topic,
                summary=summary_content,
                important_questions=important_questions,
                quizzes=mcqs[:req.number_of_questions],
                checklist=checklist
            )
            
        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=ExamPrepResponse,
            fallback_func=fallback
        )
