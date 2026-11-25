from typing import Any

from app.agents.base_agent import AIConfigurationError, AIProviderError, BaseAgent
from app.rag.knowledge_base import knowledge_base


class AssistantAgent(BaseAgent):
    """Kaoyan Q&A assistant integrating RAG retrieval and memory context."""

    def answer_question(
        self,
        *,
        user_message: str,
        history: list,
        context: dict[str, Any] | None = None,
        profile_summary: str = "",
        memories: list[str] | None = None,
    ) -> tuple[str, list[str], list[dict[str, Any]], str]:
        """Return (reply, suggested_questions, sources, source_mode)."""
        retrieved_sources = knowledge_base.search(user_message, top_k=3)

        context_lines = []
        if profile_summary:
            context_lines.append(f"考生档案摘要：{profile_summary}")
        if memories:
            context_lines.append(f"近期学习记忆与薄弱点：{'；'.join(memories[:3])}")
        if context:
            subj = context.get("subject")
            career = context.get("career")
            if subj:
                context_lines.append(f"当前关注科目：{subj}")
            if career:
                context_lines.append(f"目标方向：{career}")

        rag_block = ""
        if retrieved_sources:
            rag_parts = [
                f"[资料{i}] {item['title']}：{item['snippet']}"
                for i, item in enumerate(retrieved_sources, start=1)
            ]
            rag_block = "\n\n参考考研知识库片段：\n" + "\n".join(rag_parts)

        system_instruction = (
            "你是「智能考研规划助理」中的考研知识问答智能体（AssistantAgent）。"
            "请结合参考考研知识库片段、考生档案与学习记忆，给出专业、条理清晰、可落地的简体中文回答（150-300字，重点加粗）。"
            "若引用了知识库内容，请在正文中自然标注参考依据，不要编造未提供的资料。"
        )
        if context_lines:
            system_instruction += "\n\n" + "\n".join(context_lines)
        if rag_block:
            system_instruction += rag_block

        def fallback() -> tuple[str, list[str]]:
            msg = user_message.lower()
            if any(w in msg for w in ("hello", "hi", "你好", "您好")):
                reply = (
                    "你好！我是你的 **AI 考研助手**（当前为基础回复模式）。我可以协助你：\n\n"
                    "1. 在 **AI考研规划** 页面生成与动态调整备考计划。\n"
                    "2. 在 **今日任务** 页面打卡并记录学习反馈。\n"
                    "3. 在 **考试备考** 页面刷题并沉淀错题本。\n"
                    "4. 在 **择校分析** 页面评估目标院校难度。\n\n"
                    "请问你目前正在复习哪一门考研科目？"
                )
                qs = ["如何规划408与数学复习时间？", "错题太多怎么动态调整计划？", "英语阅读怎么提分？"]
            elif any(w in msg for w in ("计划", "规划", "调整", "逾期", "plan", "replan")):
                reply = (
                    "【基础模式回复】考研规划建议遵循**基础—强化—冲刺**三阶段节奏。"
                    "如果出现连续逾期或错题集中在某一知识点，建议在 **AI考研规划** 或 **仪表盘** 点击「动态调整计划」，"
                    "系统会自动把高权重任务与薄弱环节前移重排。"
                )
                qs = ["什么是动态调整计划？", "每天应该安排多少小时学习？", "如何平衡公共课与专业课？"]
            elif any(w in msg for w in ("数学", "高数", "线代", "概率", "极限", "中值", "math")):
                reply = (
                    "【基础模式回复】考研数学提分核心在于**夯实基本概念与计算准确性**。"
                    "建议先梳理极限、微分、积分与线性代数秩/特征值体系，每刷完一个专题务必将错题录入复盘，避免只看解析不动手计算。"
                )
                qs = ["中值定理证明题怎么找辅助函数？", "线性代数如何串联各章？", "数学一和数学二有什么区别？"]
            elif any(w in msg for w in ("408", "数据结构", "计组", "操作系统", "计网", "死锁", "tcp")):
                reply = (
                    "【基础模式回复】408 专业课四门课程关联紧密：**数据结构**重视算法手写与复杂度分析，"
                    "**操作系统**聚焦 PV 同步、死锁与虚拟内存，**计组**关注存储层次与流水线，**计网**重点突破 TCP 与路由协议。"
                )
                qs = ["408各科分值占比是多少？", "操作系统PV操作怎么练？", "如何安排408刷题节奏？"]
            elif any(w in msg for w in ("英语", "阅读", "作文", "单词", "政治", "马原", "择校")):
                reply = (
                    "【基础模式回复】公共课英语重在**每日词汇与真题阅读精翻**，政治建议在强化阶段重点突破马原概念与选择题。"
                    "如需评估目标院校竞争难度，可直接前往侧边栏的 **择校分析** 页面。"
                )
                qs = ["考研英语阅读如何做同义替换？", "政治什么时候开始背诵？", "如何选择冲刺和保底院校？"]
            else:
                reply = (
                    f"【基础模式回复】关于你咨询的「**{user_message[:30]}**」，建议结合当前考纲拆分核心考点，"
                    "先完成概念理解再通过限时选择题检验掌握度。若在设置页配置大模型密钥，我将结合考研知识库为你提供更深入的个性化解析。"
                )
                qs = ["帮我推荐今日复习重点", "错题本达到多少次会触发加量？", "如何评估目标院校难度？"]
            return reply, qs

        try:
            reply, suggested_qs = self.generate_chat_reply(
                history=history,
                user_message=user_message,
                system_instruction=system_instruction,
                fallback_func=fallback,
            )
            # Check if BaseAgent silently ran fallback (when allow_fallback=True and no client)
            if not self.is_client_active or not self.client:
                return reply, suggested_qs, [], "fallback"
            return reply, suggested_qs, retrieved_sources, "llm"
        except (AIConfigurationError, AIProviderError):
            reply, qs = fallback()
            return reply, qs, [], "fallback"
