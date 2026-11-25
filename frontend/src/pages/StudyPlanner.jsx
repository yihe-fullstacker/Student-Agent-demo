import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  GitCompare,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { apiService } from "../services/api";

const LOADING_MESSAGES = [
  "正在读取考生档案与考试倒计时...",
  "正在划分基础 / 强化 / 冲刺三阶段...",
  "正在按科目与薄弱知识点拆解周计划...",
  "正在生成每日可执行任务并持久化...",
];

const PRIORITY_LABEL = {
  3: { text: "高", cls: "bg-accent/15 text-accent" },
  2: { text: "中", cls: "bg-warning/15 text-warning" },
  1: { text: "低", cls: "bg-slate-500/15 text-text-muted" },
};

const TASK_STATUS_LABEL = {
  PENDING: "待完成",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  OVERDUE: "已逾期",
};

export default function StudyPlanner({ setCurrentPage }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [replanReason, setReplanReason] = useState("");
  const [replanNotice, setReplanNotice] = useState(null);
  const [versionDiff, setVersionDiff] = useState(null);

  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activePhaseId, setActivePhaseId] = useState(null);
  const [activeWeekNum, setActiveWeekNum] = useState(1);

  const applyPlanSelection = (targetPlan) => {
    if (targetPlan?.phases?.length > 0) {
      const firstPhase = targetPlan.phases[0];
      setActivePhaseId(firstPhase.id);
      setActiveWeekNum(firstPhase.weeks?.[0]?.week_number || 1);
    } else if (targetPlan?.weeks?.length > 0) {
      setActiveWeekNum(targetPlan.weeks[0].week_number);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      apiService.getProfile(),
      apiService.getCurrentPlan(),
      apiService.getPlanVersions(),
    ])
      .then(async ([profRes, currentRes, versionsRes]) => {
        if (!active) return;
        setProfile(profRes);
        setPlan(currentRes.plan || null);
        const vList = versionsRes.versions || [];
        setVersions(vList);
        applyPlanSelection(currentRes.plan);
        if (vList.length >= 2) {
          try {
            const diffRes = await apiService.comparePlanVersions();
            if (active) setVersionDiff(diffRes);
          } catch {
            // ignore diff fetch error
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "加载考研计划失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!generating) return undefined;
    const timer = setInterval(() => {
      setLoadingStep((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 1500);
    return () => clearInterval(timer);
  }, [generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setLoadingStep(0);
    setError("");
    setReplanNotice(null);
    try {
      const res = await apiService.generateKaoyanPlan();
      setPlan(res.plan);
      applyPlanSelection(res.plan);
      const [profRes, versionsRes] = await Promise.all([
        apiService.getProfile(),
        apiService.getPlanVersions(),
      ]);
      setProfile(profRes);
      const vList = versionsRes.versions || [];
      setVersions(vList);
      if (vList.length >= 2) {
        const diffRes = await apiService.comparePlanVersions();
        setVersionDiff(diffRes);
      }
    } catch (err) {
      setError(err.message || "生成考研计划失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleReplan = async () => {
    setReplanning(true);
    setError("");
    try {
      const res = await apiService.triggerReplan(replanReason.trim());
      setPlan(res.plan);
      applyPlanSelection(res.plan);
      setReplanNotice(res);
      setReplanReason("");
      const [profRes, versionsRes, diffRes] = await Promise.all([
        apiService.getProfile(),
        apiService.getPlanVersions(),
        apiService.comparePlanVersions(),
      ]);
      setProfile(profRes);
      setVersions(versionsRes.versions || []);
      setVersionDiff(diffRes);
    } catch (err) {
      setError(err.message || "动态调整计划失败");
    } finally {
      setReplanning(false);
    }
  };

  const isProfileReady =
    profile &&
    profile.school &&
    profile.major &&
    Array.isArray(profile.subjects) &&
    profile.subjects.length > 0 &&
    profile.daily_minutes > 0;

  const activePhase = plan?.phases?.find((p) => p.id === activePhaseId) || plan?.phases?.[0];
  const visibleWeeks = activePhase?.weeks?.length ? activePhase.weeks : plan?.weeks || [];
  const activeWeek =
    visibleWeeks.find((w) => w.week_number === activeWeekNum) || visibleWeeks[0];

  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-text-muted">正在加载考研规划与版本记录...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            AI 考研分层规划与动态调整
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            支持初始分层生成、基于逾期与错题薄弱点的 AI 动态重排，以及新旧版本差异对比。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage("profile")}
            className="rounded-xl border border-border-card bg-bg-card px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover cursor-pointer"
          >
            编辑考生档案
          </button>
          {isProfileReady && (
            <button
              type="button"
              disabled={generating || replanning}
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              {plan ? "重新生成初始计划" : "立即生成 AI 考研计划"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {plan && (
        <div className="glass-card rounded-2xl border border-secondary/30 bg-secondary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[220px] space-y-1">
            <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-secondary" />
              AI 动态调整计划（结合逾期任务、学习反馈与错题薄弱点重排）
            </h3>
            <input
              type="text"
              value={replanReason}
              onChange={(e) => setReplanReason(e.target.value)}
              placeholder="可选：说明调整诉求（如：数学高数滞后，希望未来两周增加微积分练习）"
              className="input-field w-full"
            />
          </div>
          <button
            type="button"
            disabled={replanning || generating}
            onClick={handleReplan}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {replanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {replanning ? "正在重排..." : "触发 AI 动态调整"}
          </button>
        </div>
      )}

      {replanNotice && (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-xs space-y-1.5">
          <p className="font-bold text-success">
            已发布新版本 v{replanNotice.diff_summary.new_version}（原版本 v{replanNotice.diff_summary.previous_version} 已归档）
          </p>
          <p className="text-text-primary">{replanNotice.strategy.summary}</p>
          <p className="text-text-secondary">
            重排待办 {replanNotice.diff_summary.rescheduled_count} 项 · 清理逾期 {replanNotice.diff_summary.overdue_cleared_count} 项 · 新增薄弱强化任务 {replanNotice.diff_summary.added_weak_tasks_count} 项
          </p>
        </div>
      )}

      {generating ? (
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text-primary">PlanningAgent 正在构建分层考研计划...</h3>
            <p className="text-xs text-text-muted">{LOADING_MESSAGES[loadingStep]}</p>
          </div>
        </div>
      ) : !isProfileReady ? (
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-10 text-center space-y-4 max-w-xl mx-auto">
          <AlertCircle className="h-10 w-10 text-warning mx-auto" />
          <h2 className="text-base font-bold text-text-primary">尚未完善考生画像</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            请先在「考生档案」中填写目标院校、专业、考试科目、考试日期及每日可学习时间，然后再一键生成个性化考研规划。
          </p>
          <button
            type="button"
            onClick={() => setCurrentPage("profile")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
          >
            前往填写考生档案
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : !plan ? (
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-10 text-center space-y-4 max-w-xl mx-auto">
          <Sparkles className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-base font-bold text-text-primary">
            已就绪：{profile.school} · {profile.major}
          </h2>
          <p className="text-xs text-text-secondary">
            报考科目：{profile.subjects.join("、")} ｜ 每日 {profile.daily_minutes} 分钟 ｜ 水平：{profile.learning_level}
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            生成我的首份考研规划
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-card/30 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      版本 v{plan.version}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        plan.source === "llm"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {plan.source === "llm" ? "AI 实时推理生成" : "基础规则模板降级"}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold text-text-primary">{plan.title}</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    周期：{plan.start_date} 至 {plan.end_date} · 科目：{plan.subjects.join("、")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage("today")}
                  className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                >
                  去今日任务打卡
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {plan.source === "fallback" && (
                <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-[11px] text-warning">
                  提示：{plan.fallback_reason || "当前使用规则模板生成计划（source=fallback），在设置页配置大模型密钥后可重新生成 AI 深度规划。"}
                </div>
              )}

              {plan.phases?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {plan.phases.map((phase) => {
                    const isActive = activePhase?.id === phase.id;
                    return (
                      <button
                        key={phase.id}
                        type="button"
                        onClick={() => {
                          setActivePhaseId(phase.id);
                          if (phase.weeks?.[0]) {
                            setActiveWeekNum(phase.weeks[0].week_number);
                          }
                        }}
                        className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary text-white"
                            : "border-border-card bg-bg-dark/40 text-text-secondary hover:bg-bg-card-hover"
                        }`}
                      >
                        {phase.title}（{phase.weeks?.length || 0}周）
                      </button>
                    );
                  })}
                </div>
              )}

              {activePhase && (
                <p className="text-xs text-text-secondary bg-bg-dark/30 border border-border-card/40 rounded-xl px-4 py-2.5">
                  {activePhase.description}
                </p>
              )}

              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border-card/20">
                {visibleWeeks.map((week) => (
                  <button
                    key={week.id}
                    type="button"
                    onClick={() => setActiveWeekNum(week.week_number)}
                    className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      activeWeek?.week_number === week.week_number
                        ? "bg-secondary text-white"
                        : "text-text-secondary hover:bg-bg-card-hover"
                    }`}
                  >
                    第 {week.week_number} 周
                  </button>
                ))}
              </div>

              {activeWeek && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border-card bg-bg-dark/40 p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-secondary flex items-center gap-1.5">
                        <Award className="h-4 w-4" />
                        第 {activeWeek.week_number} 周目标
                      </h4>
                      <span className="text-[10px] text-text-muted">
                        {activeWeek.start_date} ~ {activeWeek.end_date}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{activeWeek.weekly_goal}</p>
                  </div>

                  <div className="space-y-3">
                    {activeWeek.tasks.map((task) => {
                      const pMeta = PRIORITY_LABEL[task.priority] || PRIORITY_LABEL[2];
                      return (
                        <div
                          key={task.id}
                          className={`rounded-xl border p-4 space-y-2 ${
                            task.status === "COMPLETED"
                              ? "border-success/30 bg-success/5"
                              : "border-border-card/60 bg-bg-dark/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {task.subject_name}
                              </span>
                              <span className="text-[10px] text-text-muted">{task.scheduled_date}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pMeta.cls}`}>
                                优先级：{pMeta.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-text-muted">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimated_minutes} 分钟
                              </span>
                              <span className="font-semibold text-text-secondary">
                                {TASK_STATUS_LABEL[task.status] || task.status}
                              </span>
                            </div>
                          </div>
                          <h5 className="text-xs font-bold text-text-primary">{task.title}</h5>
                          <p className="text-xs text-text-secondary">{task.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {versionDiff && (
              <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-3">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                  <GitCompare className="h-4 w-4 text-primary" />
                  版本差异对比（v{versionDiff.old_version.version} → v{versionDiff.new_version.version}）
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-bg-dark/40 p-2.5">
                    <p className="text-[10px] text-text-muted">总任务数变化</p>
                    <p className="font-bold text-text-primary">
                      {versionDiff.old_version.total_tasks} → {versionDiff.new_version.total_tasks}
                    </p>
                  </div>
                  <div className="rounded-xl bg-bg-dark/40 p-2.5">
                    <p className="text-[10px] text-text-muted">高优先级任务</p>
                    <p className="font-bold text-accent">
                      {versionDiff.old_version.high_priority_tasks} → {versionDiff.new_version.high_priority_tasks}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary">
                  新增薄弱强化任务：{versionDiff.delta.weak_boost_added} 项
                </p>
                {versionDiff.new_version.replan_summary && (
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    调整摘要：{versionDiff.new_version.replan_summary}
                  </p>
                )}
              </div>
            )}

            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                <Bookmark className="h-4 w-4 text-primary" />
                阶段里程碑
              </h3>
              <div className="space-y-4 pl-3 border-l border-border-card/60 ml-2">
                {plan.milestones?.map((ms, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold text-primary">{ms.target_date}</span>
                    <h4 className="text-xs font-bold text-text-primary">{ms.title}</h4>
                    <p className="text-[11px] text-text-secondary">{ms.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                <CheckCircle2 className="h-4 w-4 text-success" />
                备考关键清单
              </h3>
              <ul className="space-y-2.5">
                {plan.checklist?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {versions.length > 0 && (
              <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-3">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                  <History className="h-4 w-4 text-secondary" />
                  历史版本记录
                </h3>
                <div className="space-y-2.5">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-border-card/60 bg-bg-dark/30 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary">v{v.version}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            v.status === "ACTIVE"
                              ? "bg-success/15 text-success"
                              : "bg-slate-500/15 text-text-muted"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate">{v.title}</p>
                      <p className="text-[10px] text-text-muted">
                        已完成 {v.completed_count} / {v.task_count} 项 · {v.source}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
