import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CheckSquare,
  Clock,
  Loader2,
  Target,
  TrendingUp,
} from "lucide-react";
import { apiService } from "../services/api";

export default function Dashboard({ setCurrentPage }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [todayData, setTodayData] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([apiService.getRecordStats(), apiService.getTodayTasks()])
      .then(([statsRes, tasksRes]) => {
        if (!active) return;
        setStats(statsRes);
        setTodayData(tasksRes);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "加载考研仪表盘数据失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3 min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-text-muted">正在聚合你的学习记录与考研进度...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6 text-xs text-accent">
        {error || "无法获取统计数据"}
      </div>
    );
  }

  const weeklyTrend = stats.weekly_trend || [];
  const maxMinutes = Math.max(
    ...weeklyTrend.map((w) => Math.max(w.planned_minutes || 0, w.actual_minutes || 0)),
    60
  );
  const pendingToday = (todayData?.task_list || []).filter((t) => t.status !== "COMPLETED");

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">考研学习分析</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            {stats.exam_countdown
              ? `${stats.exam_countdown.school} · ${stats.exam_countdown.major}`
              : "考研备考总览仪表盘"}
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            所有时长、完成率与趋势均实时统计自你的真实打卡记录。
          </p>
        </div>

        {stats.exam_countdown?.days_remaining !== null && stats.exam_countdown?.days_remaining !== undefined ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
            <Calendar className="h-4 w-4" />
            距 {stats.exam_countdown.exam_year} 初试还有 {stats.exam_countdown.days_remaining} 天
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentPage("profile")}
            className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-xs font-bold text-warning cursor-pointer"
          >
            完善考生档案设置倒计时
          </button>
        )}
      </div>

      {stats.needs_replan_warning && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3.5 text-xs text-accent">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              当前存在 {stats.overdue_tasks_count} 项逾期任务（平均落后 {stats.behind_days} 天），建议尽快前往补做或触发 AI 动态调整计划。
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage("today")}
              className="rounded-lg border border-accent/40 px-3 py-1.5 font-bold text-accent cursor-pointer"
            >
              处理逾期任务
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage("planner")}
              className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white cursor-pointer"
            >
              一键 AI 动态调整
            </button>
          </div>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">累计学习时长</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.total_study_hours} 小时</h3>
            <p className="text-[10px] text-text-secondary">今日 {stats.today_study_minutes} 分钟</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">任务完成率</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.task_completion_rate}%</h3>
            <p className="text-[10px] text-text-secondary">
              {stats.completed_tasks_count} / {stats.total_tasks_count} 项
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">落后天数预警</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.behind_days} 天</h3>
            <p className="text-[10px] text-text-secondary">逾期 {stats.overdue_tasks_count} 项任务</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">答题正确率</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.quiz_accuracy_rate}%</h3>
            <p className="text-[10px] text-text-secondary">累计知识点练习</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 4-week Trend Chart */}
        <div className="glass-card lg:col-span-2 rounded-2xl border p-6 bg-bg-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                近 4 周学习时长趋势（计划 vs 实际）
              </h3>
              <p className="text-[10px] text-text-muted mt-0.5">单位：分钟</p>
            </div>
          </div>

          <div className="flex h-48 items-end gap-4 border-b border-border-card/30 px-2 pb-8 pt-4">
            {weeklyTrend.map((week) => (
              <div key={week.label} className="relative flex h-full flex-1 items-end justify-center gap-2">
                <div
                  title={`计划 ${week.planned_minutes} 分钟`}
                  className="w-4 sm:w-6 rounded-t bg-primary/35 transition-all"
                  style={{ height: `${Math.max(8, Math.round((week.planned_minutes / maxMinutes) * 100))}%` }}
                />
                <div
                  title={`实际 ${week.actual_minutes} 分钟`}
                  className="w-4 sm:w-6 rounded-t bg-success transition-all"
                  style={{ height: `${Math.max(8, Math.round((week.actual_minutes / maxMinutes) * 100))}%` }}
                />
                <span className="absolute -bottom-6 text-[10px] text-text-muted">{week.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-6 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
              计划投入时长
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              实际打卡时长
            </span>
          </div>
        </div>

        {/* Today's Pending Tasks */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border-card/30 pb-2">
              <h3 className="text-sm font-bold text-text-primary">今日待完成任务</h3>
              <span className="text-[10px] text-text-muted">{pendingToday.length} 项待办</span>
            </div>

            {pendingToday.length > 0 ? (
              <div className="space-y-2.5">
                {pendingToday.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-border-card bg-bg-dark/40 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-primary">{task.subject_name}</span>
                      <span className="text-text-muted">{task.estimated_minutes} 分钟</span>
                    </div>
                    <p className="text-xs font-semibold text-text-primary truncate">{task.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs font-semibold text-text-secondary">
                  {stats.total_tasks_count > 0 ? "今日任务已全部完成！" : "暂无已拆解的学习计划"}
                </p>
                <p className="text-[10px] text-text-muted">
                  {stats.total_tasks_count > 0
                    ? "可以前往「学习记录」复盘笔记或刷题巩固。"
                    : "先完善考生档案，再生成 AI 考研计划。"}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage(stats.total_tasks_count > 0 ? "today" : "profile")}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-2 text-xs font-bold text-primary hover:bg-primary/20 cursor-pointer"
          >
            {stats.total_tasks_count > 0 ? "进入今日任务打卡" : "前往填写考生档案"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Subject Completion Progress */}
      <section className="glass-card rounded-2xl border p-6 bg-bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-border-card/30 pb-3">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            各科目任务完成进度
          </h3>
          <button
            type="button"
            onClick={() => setCurrentPage("records")}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            查看学习记录流水 →
          </button>
        </div>

        {stats.subject_progress?.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.subject_progress.map((subj) => (
              <div
                key={subj.subject_name}
                className="rounded-xl border border-border-card bg-bg-dark/30 p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text-primary">{subj.subject_name}</span>
                  <span className="font-bold text-primary">{subj.completion_rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-card-hover">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${subj.completion_rate}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-muted">
                  已完成 {subj.completed_count} / {subj.total_count} 项任务
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">生成考研计划后，此处将按科目展示完成进度。</p>
        )}
      </section>
    </div>
  );
}
