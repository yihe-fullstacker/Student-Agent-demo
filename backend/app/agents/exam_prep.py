from typing import Optional

from pydantic import BaseModel, Field

from app.agents.base_agent import AIConfigurationError, AIProviderError, BaseAgent
from app.models import ExamPrepRequest, ExamPrepResponse, ImportantQuestion, MCQ


class KaoyanQuizResponse(BaseModel):
    questions: list[MCQ] = Field(min_length=1, description="Generated multiple choice questions")


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

            important_questions = [
                ImportantQuestion(
                    question=f"说明 {req.topic} 的主要用途，并列出三个实际应用场景。",
                    sample_answer=(
                        f"{req.topic} 的主要用途是帮助系统分析数据、解决任务并优化工作流程。"
                        "三个典型应用包括：\n"
                        "1. 自动化决策支持系统。\n"
                        "2. 模式识别与分类。\n"
                        "3. 可扩展基础设施中的资源分配与成本优化。"
                    ),
                ),
                ImportantQuestion(
                    question=f"实施 {req.topic} 时主要会遇到哪些挑战或瓶颈？应如何缓解？",
                    sample_answer=(
                        f"{req.topic} 的主要挑战包括计算复杂度高、数据质量问题以及模型泛化失败（过拟合）。\n"
                        "缓解方式：\n"
                        "- 使用 *降维* 降低计算开销。\n"
                        "- 通过 *交叉验证* 和正则化改善泛化能力。\n"
                        "- 建立 *预处理流程* 处理缺失值并统一特征尺度。"
                    ),
                ),
            ]

            mcqs = [
                MCQ(
                    id=1,
                    question=f"以下哪一项最准确地描述了 {req.topic} 的主要目标？",
                    options=[
                        "在去中心化数据库中存储海量文件",
                        "从模式中提取有效信息、自动执行操作或进行预测",
                        "使用层叠样式表设计用户界面",
                        "仅通过负载均衡器优化网络请求",
                    ],
                    correct_answer_index=1,
                    explanation=f"{req.topic} 的核心是从数据中提取模式并支持自动化决策。其他选项分别对应数据存储、网页设计或网络负载均衡。",
                ),
                MCQ(
                    id=2,
                    question="在系统评估中，过拟合（Overfitting）意味着什么？",
                    options=[
                        "模型在未见数据上表现很好，但在训练数据上表现很差",
                        "模型在训练集和测试集上表现都很差",
                        "模型过度记住了训练数据细节，无法泛化到新的测试数据",
                        "模型运行速度太快，无法处理大型数据库",
                    ],
                    correct_answer_index=2,
                    explanation="过拟合是指模型过度贴合训练数据甚至记住了噪声，导致其在新数据上的性能明显下降。",
                ),
                MCQ(
                    id=3,
                    question=f"在严重类别不平衡的情况下，评估 {req.topic} 性能时最应关注哪个指标？",
                    options=[
                        "简单的分类准确率",
                        "F1-Score（精确率与召回率）",
                        "毫秒级执行时间",
                        "编写的代码行数",
                    ],
                    correct_answer_index=1,
                    explanation="在类别不平衡的数据集中，单一准确率容易产生误导，F1-Score 能平衡精确率与召回率，更真实地反映表现。",
                ),
            ]

            while len(mcqs) < req.number_of_questions:
                q_id = len(mcqs) + 1
                mcqs.append(
                    MCQ(
                        id=q_id,
                        question=f"在生产环境中分析 {req.topic} 时，以下哪项是标准的最佳实践？",
                        options=[
                            "不编写单元测试、不验证数据质量，直接部署代码",
                            "建立完善的日志记录、验证输入数据并监控性能漂移",
                            "删除全部历史日志以节省磁盘空间",
                            "将所有代码写入一个巨大的文件，不采用模块化结构",
                        ],
                        correct_answer_index=1,
                        explanation="生产环境需要严格的监控、输入验证和日志记录，以便追踪错误并及时应对数据漂移。",
                    )
                )

            checklist = [
                f"梳理 {req.topic} 的理论基础",
                "熟记关键公式与架构结构",
                "理解速度、准确率和复杂度之间的取舍",
                "先自行作答，再查看选项，完成至少 5 道选择题",
                "整理一页只包含图表和关键词的速查表",
            ]

            return ExamPrepResponse(
                topic=req.topic,
                summary=summary_content,
                important_questions=important_questions,
                quizzes=mcqs[: req.number_of_questions],
                checklist=checklist,
            )

        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=ExamPrepResponse,
            fallback_func=fallback,
        )

    def generate_kaoyan_quiz(
        self,
        *,
        subject_name: str,
        knowledge_point_name: str,
        difficulty: str = "Intermediate",
        count: int = 5,
    ) -> tuple[list[MCQ], str, Optional[str]]:
        """Generate kaoyan MCQs for a subject & knowledge point with graceful fallback."""
        topic_label = f"{subject_name} - {knowledge_point_name}" if knowledge_point_name else subject_name
        system_instruction = (
            "你是考研刷题智能体（ExamAgent）。请严格围绕指定考研科目与知识点出题。"
            "每道题必须有 4 个选项、唯一正确答案索引（0~3）以及清晰准确的解析。"
        )
        prompt = (
            f"请围绕考研科目「{subject_name}」的知识点「{knowledge_point_name or subject_name}」生成 {count} 道单选题。\n"
            f"难度：{difficulty}\n"
            "题目应贴近考研真题风格，选项具有一定干扰性，解析要指出解题关键与常见易错点。"
        )

        fallback_state: dict[str, Optional[str]] = {"used": None, "reason": None}

        def build_fallback(reason: Optional[str] = None) -> KaoyanQuizResponse:
            fallback_state["used"] = "1"
            fallback_state["reason"] = reason or "未配置大模型密钥或模型服务不可用，已切换基础题库模式"

            bank = [
                MCQ(
                    id=1,
                    question=f"在复习「{topic_label}」时，以下哪种做法最符合考研高效巩固原则？",
                    options=[
                        "只反复通读教材，从不动手做题或复述",
                        "梳理核心概念与公式条件，结合真题错题进行间隔复盘",
                        "跳过基础例题，直接盲目刷高难度偏题",
                        "完全依赖考前一周突击背诵",
                    ],
                    correct_answer_index=1,
                    explanation=f"针对「{topic_label}」，建立知识框架并配合真题错题复盘，才能真正提高考场得分率。",
                ),
                MCQ(
                    id=2,
                    question=f"关于「{knowledge_point_name or subject_name}」的考纲命题规律，下列说法正确的是？",
                    options=[
                        "历年真题只考孤立记忆，不结合综合场景",
                        "核心定义、适用前提与典型题型变式是高频考查重点",
                        "基础概念在考研初试中通常不占分值",
                        "只要记住结论即可，无需关注定理推导或适用边界",
                    ],
                    correct_answer_index=1,
                    explanation="考研命题强调基础概念、前提条件与综合应用能力的结合，忽视前提条件极易失分。",
                ),
                MCQ(
                    id=3,
                    question=f"当你在「{topic_label}」专项练习中连续出错时，最合理的改进策略是？",
                    options=[
                        "忽略错题继续刷下一章新题",
                        "归因定位到具体概念漏洞，整理错题本并安排重刷直到完全掌握",
                        "直接背诵答案选项字母",
                        "完全放弃该知识点的全部复习",
                    ],
                    correct_answer_index=1,
                    explanation="错题是最直接的薄弱点信号，通过错题本溯源并反复重刷可显著降低二次失误率。",
                ),
                MCQ(
                    id=4,
                    question=f"在「{subject_name}」冲刺阶段对「{knowledge_point_name or '核心考点'}」进行限时训练的主要目的是？",
                    options=[
                        "训练解题节奏、时间分配与在压力下的准确率",
                        "单纯为了增加做题数量",
                        "替代对基础错题的复盘",
                        "验证教材排版是否准确",
                    ],
                    correct_answer_index=0,
                    explanation="限时训练能够暴露计算速度与审题习惯问题，提升正式考场的时间掌控力。",
                ),
                MCQ(
                    id=5,
                    question=f"面对「{topic_label}」中的易混淆概念，以下哪项最有助于长期记忆？",
                    options=[
                        "将相似概念并列对比适用条件、典型反例与联系",
                        "只抄写概念定义十遍而不做区分",
                        "每次遇到都重新猜测",
                        "只看解析不自己动手推导",
                    ],
                    correct_answer_index=0,
                    explanation="对比辨析（定义、前提、反例）能有效防止考场概念混淆。",
                ),
            ]

            questions: list[MCQ] = []
            for idx in range(count):
                template = bank[idx % len(bank)]
                questions.append(
                    MCQ(
                        id=idx + 1,
                        question=template.question if idx < len(bank) else f"（拓展第{idx + 1}题）{template.question}",
                        options=list(template.options),
                        correct_answer_index=template.correct_answer_index,
                        explanation=template.explanation,
                    )
                )
            return KaoyanQuizResponse(questions=questions)

        try:
            res = self.generate_structured_output(
                prompt=prompt,
                system_instruction=system_instruction,
                response_schema=KaoyanQuizResponse,
                fallback_func=build_fallback,
            )
            if fallback_state["used"]:
                return res.questions[:count], "fallback", fallback_state["reason"]
            # Normalize sequential IDs
            normalized = [
                MCQ(
                    id=i + 1,
                    question=q.question,
                    options=q.options[:4],
                    correct_answer_index=max(0, min(3, q.correct_answer_index)),
                    explanation=q.explanation,
                )
                for i, q in enumerate(res.questions[:count])
            ]
            return normalized, "llm", None
        except (AIConfigurationError, AIProviderError) as exc:
            fb = build_fallback(str(exc))
            return fb.questions[:count], "fallback", str(exc)
