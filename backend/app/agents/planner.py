from datetime import date, datetime
import re
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.agents.base_agent import AIConfigurationError, AIProviderError, BaseAgent
from app.models import DailyPlan, Milestone, PlannerRequest, StudyPlan, WeeklySchedule


class KaoyanTaskDraft(BaseModel):
    day_offset_in_week: int = Field(ge=0, le=6, description="Day index within the week (0=day1..6=day7)")
    subject_name: str = Field(description="Subject name for this task")
    title: str = Field(description="Short actionable task title")
    description: str = Field(description="Concrete study activities and deliverables")
    estimated_minutes: int = Field(gt=0, le=480, description="Estimated minutes")
    priority: int = Field(ge=1, le=3, description="Priority: 3=High, 2=Medium, 1=Low")


class KaoyanWeekDraft(BaseModel):
    week_number: int = Field(ge=1, le=16, description="Week number starting from 1")
    phase_type: Literal["FOUNDATION", "ENHANCEMENT", "SPRINT"] = Field(
        description="Stage this week belongs to"
    )
    weekly_goal: str = Field(description="Weekly learning objective")
    tasks: list[KaoyanTaskDraft] = Field(min_length=1, description="Daily tasks in this week")


class KaoyanPhaseDraft(BaseModel):
    phase_type: Literal["FOUNDATION", "ENHANCEMENT", "SPRINT"]
    title: str
    description: str
    week_numbers: list[int]


class KaoyanMilestoneDraft(BaseModel):
    title: str
    target_date: str
    description: str


class KaoyanPlanDraft(BaseModel):
    title: str
    phases: list[KaoyanPhaseDraft]
    weeks: list[KaoyanWeekDraft]
    milestones: list[KaoyanMilestoneDraft]
    checklist: list[str]


class ReplanStrategyDraft(BaseModel):
    summary: str = Field(description="Concise summary of adjustment strategy")
    pace_adjustment: str = Field(description="How daily pace or task order is adjusted")
    weak_boost_topics: list[str] = Field(description="Weak topics that need extra practice tasks")
    recommendations: list[str] = Field(description="Concrete execution suggestions")


class SchoolRecommendationTier(BaseModel):
    tier: str = Field(description="冲刺 / 稳妥 / 保底")
    schools: list[str] = Field(description="Recommended universities")
    reason: str = Field(description="Rationale for this tier")


class SchoolAnalysisDraft(BaseModel):
    target_school: str
    target_major: str
    difficulty_level: str = Field(description="高难度 / 中等偏上 / 稳妥可控")
    score_reference: str = Field(description="Reference score line range and breakdown")
    exam_subjects_advice: str = Field(description="Advice on public and major subjects")
    tier_recommendations: list[SchoolRecommendationTier]
    action_suggestions: list[str]


def compute_plan_weeks(exam_date: date, today: Optional[date] = None) -> int:
    """Design doc 3.2.4: <7 days => 1 week, otherwise min(max(1, days // 7), 16)."""
    ref = today or date.today()
    days_until = (exam_date - ref).days
    if days_until < 7:
        return 1
    return min(max(1, days_until // 7), 16)


def _split_weak_topics(weakness: str) -> list[str]:
    if not weakness or not weakness.strip():
        return []
    return [item.strip() for item in re.split(r"[,，、;\n]+", weakness) if item.strip()]


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
            try:
                exam_dt = datetime.strptime(req.exam_date, "%Y-%m-%d")
                days_until = (exam_dt - datetime.now()).days
                if days_until < 7:
                    weeks = 1
                else:
                    weeks = min(max(1, days_until // 7), 8)
            except Exception:
                weeks = 4

            standard_topics = ["入门与核心基础", "进阶概念与知识结构", "高级实践与项目应用", "模拟测试与最终复习"]
            if req.weak_topics:
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
                    priority = (
                        "High"
                        if (i % 2 == 0 or any(wt.lower() in topics_list[w - 1].lower() for wt in req.weak_topics))
                        else "Medium"
                    )

                    subtopic = f"{topics_list[w-1]} - 第 {i + 1} 节"
                    activities = [
                        f"阅读 {subtopic} 的学习指南或教材",
                        f"完成 5 道关于 {subtopic} 的练习题",
                    ]
                    if priority == "High":
                        activities.append(f"整理 {subtopic} 的总结笔记")

                    days.append(
                        DailyPlan(
                            day_name=day,
                            topic=topics_list[w - 1],
                            subtopics=[subtopic],
                            duration_hours=req.daily_hours,
                            priority=priority,
                            activities=activities,
                        )
                    )

                weekly_schedules.append(
                    WeeklySchedule(
                        week_number=w,
                        weekly_goal=weekly_goal,
                        days=days,
                    )
                )

            milestones = [
                Milestone(
                    title="第一周基准测试",
                    target_date="第一周结束",
                    description=f"完成 {req.subject_name} 的基础内容并解答入门练习。",
                )
            ]
            if weeks > 1:
                milestones.append(
                    Milestone(
                        title="薄弱主题掌握",
                        target_date=f"第 {weeks // 2 + 1} 周结束",
                        description=f"完成以下薄弱主题的复习与练习：{', '.join(req.weak_topics[:3])}。",
                    )
                )
            milestones.append(
                Milestone(
                    title="考试准备度",
                    target_date="考试前 3 天",
                    description="模拟测验正确率达到 80% 以上，并完成复习清单。",
                )
            )

            checklist = [
                f"复习 {req.subject_name} 各重点章节的总结笔记",
                f"额外安排时间复习以下主题笔记：{', '.join(req.weak_topics[:3])}",
                "至少完成两套完整的模拟考试",
                "确保熟记所有公式和定义",
                "回顾练习测验中的错题记录",
            ]

            return StudyPlan(
                subject_name=req.subject_name,
                weekly_schedule=weekly_schedules,
                milestones=milestones,
                exam_readiness_checklist=checklist,
            )

        return self.generate_structured_output(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=StudyPlan,
            fallback_func=fallback,
        )

    def generate_kaoyan_plan(
        self,
        *,
        exam_year: int,
        school: str,
        major: str,
        exam_date: date,
        subjects: list[str],
        daily_minutes: int,
        learning_level: str,
        weakness: str,
        target_score: Optional[int] = None,
    ) -> tuple[KaoyanPlanDraft, str, Optional[str]]:
        """Generate a hierarchical multi-subject kaoyan plan with automatic fallback."""
        total_weeks = compute_plan_weeks(exam_date)
        weak_topics = _split_weak_topics(weakness)

        system_instruction = (
            "你是智能考研规划智能体（PlanningAgent）。"
            "请根据考生画像生成分层化考研学习计划：总体计划 -> 阶段计划（基础 FOUNDATION、强化 ENHANCEMENT、冲刺 SPRINT）-> 周计划 -> 每日具体任务。"
            "要求：\n"
            f"1. 计划总周数必须严格为 {total_weeks} 周（week_number 从 1 到 {total_weeks}）。\n"
            "2. 每天至少安排 1~2 个可执行任务，所有薄弱知识点必须优先安排在前期周次并设置 priority=3（高优先级）。\n"
            "3. 每日任务总时长贴合考生每日可用分钟数，且科目需覆盖用户全部报考科目。"
        )

        prompt = (
            f"目标院校与专业：{exam_year}年 {school} - {major}\n"
            f"考试日期：{exam_date.isoformat()}（规划周期：{total_weeks} 周）\n"
            f"目标总分：{target_score or '未设定'}\n"
            f"考试科目：{', '.join(subjects)}\n"
            f"当前学习水平：{learning_level}\n"
            f"每日可学习时间：{daily_minutes} 分钟\n"
            f"薄弱知识点：{weakness or '无明显指定，均衡推进'}\n\n"
            "请严格按照 JSON Schema 输出结构化考研计划。"
        )

        fallback_state: dict[str, Optional[str]] = {"used": None, "reason": None}

        def build_fallback(reason: Optional[str] = None) -> KaoyanPlanDraft:
            fallback_state["used"] = "1"
            fallback_state["reason"] = reason or "未配置大模型密钥或模型服务不可用，已自动切换基础规则模板计划"

            # Partition weeks into FOUNDATION / ENHANCEMENT / SPRINT
            foundation_end = max(1, round(total_weeks * 0.45)) if total_weeks >= 3 else 1
            enhancement_end = (
                max(foundation_end + 1, round(total_weeks * 0.8))
                if total_weeks >= 3
                else total_weeks
            )

            phase_weeks: dict[str, list[int]] = {
                "FOUNDATION": [],
                "ENHANCEMENT": [],
                "SPRINT": [],
            }
            for w in range(1, total_weeks + 1):
                if w <= foundation_end:
                    phase_weeks["FOUNDATION"].append(w)
                elif w <= enhancement_end:
                    phase_weeks["ENHANCEMENT"].append(w)
                else:
                    phase_weeks["SPRINT"].append(w)

            phases: list[KaoyanPhaseDraft] = []
            phase_meta = [
                ("FOUNDATION", "基础夯实阶段", "全面梳理考纲基础概念，优先攻克薄弱知识点并建立知识框架。"),
                ("ENHANCEMENT", "强化突破阶段", "开展题型专题训练与重难点进阶，结合错题反复巩固。"),
                ("SPRINT", "冲刺模考阶段", "全真模拟套卷限时训练，查漏补缺与核心考点背诵。"),
            ]
            for p_type, p_title, p_desc in phase_meta:
                if phase_weeks[p_type]:
                    phases.append(
                        KaoyanPhaseDraft(
                            phase_type=p_type,
                            title=p_title,
                            description=p_desc,
                            week_numbers=phase_weeks[p_type],
                        )
                    )

            weeks_draft: list[KaoyanWeekDraft] = []
            task_minutes_per_slot = max(30, min(daily_minutes, max(45, daily_minutes // 2)))
            second_slot_minutes = max(30, daily_minutes - task_minutes_per_slot)

            for w in range(1, total_weeks + 1):
                if w in phase_weeks["FOUNDATION"]:
                    p_type = "FOUNDATION"
                    stage_verb = "基础精读与概念梳理"
                elif w in phase_weeks["ENHANCEMENT"]:
                    p_type = "ENHANCEMENT"
                    stage_verb = "专题刷题与错题复盘"
                else:
                    p_type = "SPRINT"
                    stage_verb = "真题模拟与核心背诵"

                weekly_tasks: list[KaoyanTaskDraft] = []
                # Generate 5 study days per week (Mon-Fri offsets 0..4), with 1-2 tasks/day
                for day_idx in range(5):
                    primary_subj = subjects[(w + day_idx - 1) % len(subjects)]
                    weak_focus = (
                        weak_topics[(w + day_idx - 1) % len(weak_topics)]
                        if weak_topics and w <= foundation_end
                        else None
                    )
                    if weak_focus:
                        t_title = f"[{primary_subj}] 重点攻克：{weak_focus}"
                        t_desc = f"围绕薄弱点「{weak_focus}」进行教材精读、公式/原理推导及配套练习。"
                        t_priority = 3
                    else:
                        t_title = f"[{primary_subj}] 第{w}周{stage_verb}"
                        t_desc = f"完成{primary_subj}第{w}周核心章节学习与课后习题训练，及时整理笔记。"
                        t_priority = 3 if day_idx % 2 == 0 else 2

                    weekly_tasks.append(
                        KaoyanTaskDraft(
                            day_offset_in_week=day_idx,
                            subject_name=primary_subj,
                            title=t_title[:180],
                            description=t_desc,
                            estimated_minutes=task_minutes_per_slot,
                            priority=t_priority,
                        )
                    )

                    if len(subjects) > 1 and daily_minutes >= 90:
                        sec_subj = subjects[(w + day_idx) % len(subjects)]
                        weekly_tasks.append(
                            KaoyanTaskDraft(
                                day_offset_in_week=day_idx,
                                subject_name=sec_subj,
                                title=f"[{sec_subj}] 巩固练习与回顾"[:180],
                                description=f"保持{sec_subj}日常手感，完成限时练习与昨日错题回顾。",
                                estimated_minutes=second_slot_minutes,
                                priority=2,
                            )
                        )

                goal_suffix = f"（重点突破：{', '.join(weak_topics[:2])}）" if weak_topics and w <= foundation_end else ""
                weeks_draft.append(
                    KaoyanWeekDraft(
                        week_number=w,
                        phase_type=p_type,
                        weekly_goal=f"第 {w} 周：完成 {', '.join(subjects[:3])} {stage_verb}{goal_suffix}。",
                        tasks=weekly_tasks,
                    )
                )

            milestones = [
                KaoyanMilestoneDraft(
                    title="基础阶段完成节点",
                    target_date=f"第 {foundation_end} 周结束",
                    description=f"完成 {', '.join(subjects)} 基础轮知识覆盖" + (f"，重点补齐 {weak_topics[0]}" if weak_topics else "") + "。",
                ),
                KaoyanMilestoneDraft(
                    title="强化训练验收节点",
                    target_date=f"第 {enhancement_end} 周结束",
                    description="完成各科目高频题型专题训练，错题率控制在 20% 以内。",
                ),
                KaoyanMilestoneDraft(
                    title="考前全真冲刺节点",
                    target_date=exam_date.isoformat(),
                    description=f"完成近 5 年真题全真模拟，以最佳状态迎接 {school} {major} 考试。",
                ),
            ]

            checklist = [
                f"完成 {', '.join(subjects)} 全部核心考点一轮梳理",
                "整理并二刷所有标记为薄弱点的错题记录",
                "严格按考研时间完成至少 3 套全真模拟试卷",
                "考前一周回归错题本、核心公式与作文模板",
            ]

            return KaoyanPlanDraft(
                title=f"{exam_year}考研规划 · {school} {major}（{total_weeks}周）",
                phases=phases,
                weeks=weeks_draft,
                milestones=milestones,
                checklist=checklist,
            )

        try:
            draft = self.generate_structured_output(
                prompt=prompt,
                system_instruction=system_instruction,
                response_schema=KaoyanPlanDraft,
                fallback_func=build_fallback,
            )
            if fallback_state["used"]:
                return draft, "fallback", fallback_state["reason"]
            return draft, "llm", None
        except (AIConfigurationError, AIProviderError) as exc:
            draft = build_fallback(str(exc))
            return draft, "fallback", str(exc)

    def generate_replan_strategy(
        self,
        *,
        school: str,
        major: str,
        overdue_count: int,
        pending_count: int,
        weak_topics: list[str],
        hard_feedbacks: list[str],
        user_reason: str = "",
    ) -> tuple[ReplanStrategyDraft, str, Optional[str]]:
        """Analyze progress deviation and weak points to produce a replanning strategy."""
        system_instruction = (
            "你是考研动态调整规划智能体（PlanningAgent）。"
            "请根据考生当前逾期任务数、待办任务数、困难反馈与薄弱知识点，"
            "给出务实的计划重排策略与需要加量复习的薄弱主题列表。"
        )
        prompt = (
            f"考生目标：{school} - {major}\n"
            f"当前逾期任务数：{overdue_count}，待完成任务数：{pending_count}\n"
            f"识别到的薄弱知识点：{', '.join(weak_topics) if weak_topics else '暂无明显薄弱点'}\n"
            f"近期困难反馈：{'; '.join(hard_feedbacks) if hard_feedbacks else '无'}\n"
            f"用户调整诉求：{user_reason or '优化近期进度并强化薄弱项'}\n"
            "请按 JSON Schema 输出调整策略。"
        )

        fallback_state: dict[str, Optional[str]] = {"used": None, "reason": None}

        def build_fallback(reason: Optional[str] = None) -> ReplanStrategyDraft:
            fallback_state["used"] = "1"
            fallback_state["reason"] = reason or "未配置大模型密钥或模型服务不可用，已采用规则策略重排"
            focus_topics = weak_topics[:3] if weak_topics else ["核心高频考点复盘"]
            pace = (
                "优先清理逾期任务并将每日任务拆细，优先保证高优先级科目不断档"
                if overdue_count > 0
                else "保持当前推进节奏，将高错题率知识点前移并增加专项练习"
            )
            return ReplanStrategyDraft(
                summary=f"针对 {overdue_count} 项逾期任务与 {len(focus_topics)} 个重点薄弱项完成重排，优先保障 {school} 考试高权重模块。",
                pace_adjustment=pace,
                weak_boost_topics=focus_topics,
                recommendations=[
                    "未来 3 天优先完成标为高优先级的逾期顺延任务",
                    f"针对「{', '.join(focus_topics)}」增加每日 45 分钟专项巩固与错题重刷",
                    "每次任务打卡后及时补充掌握度自评，便于下一轮精准调整",
                ],
            )

        try:
            res = self.generate_structured_output(
                prompt=prompt,
                system_instruction=system_instruction,
                response_schema=ReplanStrategyDraft,
                fallback_func=build_fallback,
            )
            if fallback_state["used"]:
                return res, "fallback", fallback_state["reason"]
            return res, "llm", None
        except (AIConfigurationError, AIProviderError) as exc:
            return build_fallback(str(exc)), "fallback", str(exc)

    def analyze_target_school(
        self,
        *,
        target_school: str,
        target_major: str,
        target_score: Optional[int],
        current_level: str,
        undergrad_bg: str = "",
        region_preference: str = "",
    ) -> tuple[SchoolAnalysisDraft, str, Optional[str]]:
        """Analyze kaoyan school/major competitiveness and suggest 3-tier backup options."""
        system_instruction = (
            "你是考研择校与专业分析顾问（PlanningAgent）。"
            "请结合考生的目标院校、专业、目标分数与当前基础，客观评估报考难度、分数线参考、"
            "初试科目建议，并给出「冲刺 / 稳妥 / 保底」三档院校梯度建议。"
        )
        prompt = (
            f"目标院校：{target_school}\n"
            f"目标专业：{target_major}\n"
            f"目标分数：{target_score or '未定'}\n"
            f"当前学习水平：{current_level}\n"
            f"本科背景：{undergrad_bg or '未填写'}\n"
            f"期望地区：{region_preference or '不限'}\n"
            "请严格按照 JSON Schema 输出分析报告。"
        )

        fallback_state: dict[str, Optional[str]] = {"used": None, "reason": None}

        def build_fallback(reason: Optional[str] = None) -> SchoolAnalysisDraft:
            fallback_state["used"] = "1"
            fallback_state["reason"] = reason or "未配置大模型密钥或模型服务不可用，已切换基础择校评估模式"
            diff = "高难度" if (target_score and target_score >= 380) or current_level == "Beginner" else "中等偏上"
            return SchoolAnalysisDraft(
                target_school=target_school,
                target_major=target_major,
                difficulty_level=diff,
                score_reference=f"建议目标总分 {target_score or 365}+（公共课需稳住 135+，数学/专业课争取 220+，具体以院校官网最新复试线为准）",
                exam_subjects_advice=f"报考「{target_major}」需重点核查目标院校是否统考 408 或自命题专业课，并提前对照近 3 年真题题型与参考书目。",
                tier_recommendations=[
                    SchoolRecommendationTier(
                        tier="冲刺档",
                        schools=[target_school, "同层次热门 985 / 一流学科高校"],
                        reason="作为第一目标全力冲刺，需保证高强度刷题与模拟分达标。",
                    ),
                    SchoolRecommendationTier(
                        tier="稳妥档",
                        schools=["省属重点 211 / 行业特色强校", f"{region_preference or '目标区域'}双一流高校"],
                        reason="专业实力扎实且历年分数线波动相对平稳，性价比高。",
                    ),
                    SchoolRecommendationTier(
                        tier="保底档",
                        schools=["区域重点一本院校（同专业统考相近方向）"],
                        reason="初试科目与参考书高度重合，可作为保底与一志愿备选。",
                    ),
                ],
                action_suggestions=[
                    f"核实 {target_school} 研究生招生网最新招生简章与专业目录",
                    "将公共课数学/英语与专业课时间分配稳定在每日 3:4 比例",
                    "在 9 月预报名之前结合模考成绩最终敲定稳妥报考档位",
                ],
            )

        try:
            res = self.generate_structured_output(
                prompt=prompt,
                system_instruction=system_instruction,
                response_schema=SchoolAnalysisDraft,
                fallback_func=build_fallback,
            )
            if fallback_state["used"]:
                return res, "fallback", fallback_state["reason"]
            return res, "llm", None
        except (AIConfigurationError, AIProviderError) as exc:
            return build_fallback(str(exc)), "fallback", str(exc)
