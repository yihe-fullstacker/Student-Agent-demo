import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquarePlus,
  Star,
} from "lucide-react";
import { apiService } from "../services/api";

const DIFFICULTY_LABEL = {
  EASY: "轻松掌握",
  MODERATE: "难度适中",
  HARD: "比较吃力",
};

export default function StudyRecords({ setCurrentPage }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [rating, setRating] = useState(4);
  const [difficulty, setDifficulty] = useState("MODERATE");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [listRes, statsRes] = await Promise.all([
        apiService.getRecordList(50),
        apiService.getRecordStats(),
      ]);
      setRecords(listRes.records || []);
      setStats(statsRes);
    } catch (err) {
      setError(err.message || "加载学习记录失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([apiService.getRecordList(50), apiService.getRecordStats()])
      .then(([listRes, statsRes]) => {
        if (!active) return;
        setRecords(listRes.records || []);
        setStats(statsRes);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "加载学习记录失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openFeedback = (rec) => {
    setEditingId(rec.id);
    setRating(rec.feedback?.self_rating || 4);
    setDifficulty(rec.feedback?.difficulty_feeling || "MODERATE");
    setNote(rec.feedback?.note || rec.note || "");
  };

  const handleSaveFeedback = async (e, recordId) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiService.submitRecordFeedback({
        record_id: recordId,
        self_rating: Number(rating),
        difficulty_feeling: difficulty,
        note: note.trim(),
      });
      setEditingId(null);
      await loadAll();
    } catch (err) {
      setError(err.message || "保存学习反馈失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            学习记录与反馈
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            所有任务打卡会自动沉淀为真实学习流水，支持补充学习备注与掌握度自评。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentPage("today")}
          className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
        >
          前往今日任务打卡
        </button>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">累计学习时长</p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {stats.total_study_hours} 小时（{stats.total_study_minutes} 分钟）
            </p>
          </div>
          <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">今日学习时长</p>
            <p className="mt-1 text-xl font-bold text-success">{stats.today_study_minutes} 分钟</p>
          </div>
          <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">任务完成率</p>
            <p className="mt-1 text-xl font-bold text-primary">{stats.task_completion_rate}%</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-text-muted">正在加载学习记录...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-text-primary">暂无学习打卡记录</p>
          <p className="text-xs text-text-muted">完成今日任务打卡后，你的学习时长与笔记将展示在这里。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const isEditing = editingId === rec.id;
            return (
              <div
                key={rec.id}
                className="glass-card rounded-2xl border border-border-card bg-bg-card p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {rec.subject_name}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        {rec.completion_status}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(rec.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">{rec.task_title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-border-card bg-bg-dark/40 px-2.5 py-1 text-xs text-text-secondary">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {rec.actual_minutes} 分钟
                    </span>
                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditingId(null) : openFeedback(rec))}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-card px-3 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover cursor-pointer"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      {rec.feedback ? "编辑反馈" : "补充反馈"}
                    </button>
                  </div>
                </div>

                {(rec.note || rec.feedback) && (
                  <div className="rounded-xl border border-border-card/50 bg-bg-dark/30 px-4 py-2.5 text-xs text-text-secondary space-y-1">
                    {rec.feedback && (
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-warning font-semibold">
                          <Star className="h-3.5 w-3.5 fill-warning" />
                          自评掌握度：{rec.feedback.self_rating} / 5
                        </span>
                        <span className="text-text-muted">
                          难度：{DIFFICULTY_LABEL[rec.feedback.difficulty_feeling] || rec.feedback.difficulty_feeling}
                        </span>
                      </div>
                    )}
                    {(rec.feedback?.note || rec.note) && (
                      <p className="text-text-secondary">备注：{rec.feedback?.note || rec.note}</p>
                    )}
                  </div>
                )}

                {isEditing && (
                  <form
                    onSubmit={(e) => handleSaveFeedback(e, rec.id)}
                    className="rounded-xl border border-border-card bg-bg-dark/50 p-4 space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-text-secondary">掌握度自评</label>
                        <div className="flex items-center gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="p-1 cursor-pointer"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  star <= rating ? "fill-warning text-warning" : "text-text-muted"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-text-secondary">难度感受</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="input-field bg-bg-dark"
                        >
                          <option value="EASY">轻松掌握</option>
                          <option value="MODERATE">难度适中</option>
                          <option value="HARD">比较吃力</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-text-secondary">学习备注</label>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="补充本节知识点复盘或待解决疑问..."
                        className="input-field"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-border-card px-4 py-1.5 text-xs text-text-secondary cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        保存反馈
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
