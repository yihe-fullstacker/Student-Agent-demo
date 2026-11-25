import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Star,
} from "lucide-react";
import { apiService } from "../services/api";

const STATUS_LABEL = {
  PENDING: { text: "待完成", cls: "bg-slate-500/15 text-text-secondary border-border-card" },
  IN_PROGRESS: { text: "进行中", cls: "bg-primary/15 text-primary border-primary/30" },
  COMPLETED: { text: "已完成", cls: "bg-success/15 text-success border-success/30" },
  OVERDUE: { text: "已逾期", cls: "bg-accent/15 text-accent border-accent/30" },
};

const PRIORITY_LABEL = {
  3: { text: "高优先级", cls: "bg-accent/15 text-accent" },
  2: { text: "中优先级", cls: "bg-warning/15 text-warning" },
  1: { text: "低优先级", cls: "bg-slate-500/15 text-text-muted" },
};

export default function TodayTasks({ setCurrentPage }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    date: "",
    task_list: [],
    overdue_tasks: [],
    total_minutes: 0,
    completed_count: 0,
  });

  // Active check-in panel state for a specific task
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [actualMinutes, setActualMinutes] = useState(60);
  const [selfRating, setSelfRating] = useState(4);
  const [difficultyFeeling, setDifficultyFeeling] = useState("MODERATE");
  const [note, setNote] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const loadTasks = useCallback(async (targetDate) => {
    setError("");
    try {
      const res = await apiService.getTodayTasks(targetDate);
      setData(res);
    } catch (err) {
      setError(err.message || "加载今日任务失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiService
      .getTodayTasks(selectedDate)
      .then((res) => {
        if (!active) return;
        setData(res);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "加载今日任务失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  const handleStart = async (taskId) => {
    setSubmittingId(taskId);
    try {
      await apiService.startTask(taskId);
      await loadTasks(selectedDate);
    } catch (err) {
      setError(err.message || "更新任务状态失败");
    } finally {
      setSubmittingId(null);
    }
  };

  const openCompleteForm = (task) => {
    setCompletingTaskId(task.id);
    setActualMinutes(task.estimated_minutes || 60);
    setSelfRating(4);
    setDifficultyFeeling("MODERATE");
    setNote("");
  };

  const handleCompleteSubmit = async (e, taskId) => {
    e.preventDefault();
    setSubmittingId(taskId);
    setError("");
    try {
      await apiService.completeTask(taskId, {
        actual_minutes: Number(actualMinutes) || 60,
        self_rating: Number(selfRating),
        difficulty_feeling: difficultyFeeling,
        note: note.trim(),
      });
      setCompletingTaskId(null);
      await loadTasks(selectedDate);
    } catch (err) {
      setError(err.message || "打卡失败，请重试");
    } finally {
      setSubmittingId(null);
    }
  };

  const renderTaskCard = (task) => {
    const statusMeta = STATUS_LABEL[task.status] || STATUS_LABEL.PENDING;
    const priorityMeta = PRIORITY_LABEL[task.priority] || PRIORITY_LABEL[2];
    const isCompleted = task.status === "COMPLETED";
    const isOpenForm = completingTaskId === task.id;

    return (
      <div
        key={task.id}
        className={`rounded-2xl border p-5 transition ${
          isCompleted
            ? "border-success/30 bg-success/5"
            : task.status === "OVERDUE"
              ? "border-accent/30 bg-accent/5"
              : "border-border-card bg-bg-card"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {task.subject_name}
              </span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${priorityMeta.cls}`}>
                {priorityMeta.text}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.cls}`}>
                {statusMeta.text}
              </span>
              {task.scheduled_date && (
                <span className="text-[10px] text-text-muted">{task.scheduled_date}</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-text-primary">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-text-secondary leading-relaxed">{task.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-lg border border-border-card bg-bg-dark/40 px-2.5 py-1 text-xs text-text-secondary">
              <Clock className="h-3.5 w-3.5 text-primary" />
              预计 {task.estimated_minutes} 分钟
            </span>
          </div>
        </div>

        {!isCompleted && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border-card/20">
            {task.status === "PENDING" && (
              <button
                type="button"
                disabled={submittingId === task.id}
                onClick={() => handleStart(task.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                开始学习
              </button>
            )}
            <button
              type="button"
              disabled={submittingId === task.id}
              onClick={() => (isOpenForm ? setCompletingTaskId(null) : openCompleteForm(task))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isOpenForm ? "收起打卡表单" : task.status === "OVERDUE" ? "补做打卡" : "完成打卡"}
            </button>
          </div>
        )}

        {isOpenForm && !isCompleted && (
          <form
            onSubmit={(e) => handleCompleteSubmit(e, task.id)}
            className="mt-4 rounded-xl border border-border-card bg-bg-dark/50 p-4 space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-text-secondary">实际学习时长（分钟）</label>
                <input
                  type="number"
                  min="1"
                  max="960"
                  required
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-text-secondary">掌握度自评（1-5星）</label>
                <div className="flex items-center gap-1 pt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelfRating(star)}
                      className="p-1 cursor-pointer"
                      aria-label={`${star}星`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          star <= selfRating ? "fill-warning text-warning" : "text-text-muted"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-text-secondary">难度感受</label>
                <select
                  value={difficultyFeeling}
                  onChange={(e) => setDifficultyFeeling(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  <option value="EASY">轻松掌握</option>
                  <option value="MODERATE">难度适中</option>
                  <option value="HARD">比较吃力</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-text-secondary">学习备注（可选）</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="记录本节重点收获或卡壳之处，便于后续动态调整计划"
                className="input-field"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompletingTaskId(null)}
                className="rounded-xl border border-border-card px-4 py-1.5 text-xs text-text-secondary hover:bg-bg-card-hover cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submittingId === task.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover cursor-pointer"
              >
                {submittingId === task.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                提交打卡并生成学习记录
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">今日学习任务</h1>
          <p className="text-xs text-text-secondary mt-1">
            查看当日拆解任务，打卡完成将自动写入学习记录并实时更新统计仪表盘。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setLoading(true);
              setSelectedDate(e.target.value);
            }}
            className="input-field [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">当日任务进度</p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {data.completed_count} / {data.task_list.length}
          </p>
        </div>
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">当日预计总时长</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{data.total_minutes} 分钟</p>
        </div>
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">待补做逾期任务</p>
          <p className="mt-1 text-xl font-bold text-accent">{data.overdue_tasks.length} 项</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-text-muted">正在加载任务清单...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.overdue_tasks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-accent flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                逾期未完成任务（建议优先补做）
              </h2>
              <div className="space-y-3">{data.overdue_tasks.map(renderTaskCard)}</div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-text-primary">
              {selectedDate} 任务清单
            </h2>
            {data.task_list.length > 0 ? (
              <div className="space-y-3">{data.task_list.map(renderTaskCard)}</div>
            ) : (
              <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-text-primary">该日期暂无安排任务</p>
                <p className="text-xs text-text-muted">
                  你可以先在「考生档案」填写目标与科目，再到「AI考研规划」生成每日学习任务。
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage("planner")}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  前往 AI 考研规划
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
