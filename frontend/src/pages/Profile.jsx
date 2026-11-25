import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
} from "lucide-react";
import { apiService } from "../services/api";

const STATUS_BADGE = {
  UNFILLED: { label: "未填写", cls: "bg-warning/15 text-warning border-warning/30" },
  PENDING_PLAN: { label: "已填写待生成计划", cls: "bg-primary/15 text-primary border-primary/30" },
  PLAN_GENERATED: { label: "已生成计划", cls: "bg-success/15 text-success border-success/30" },
  PLAN_ADJUSTED: { label: "计划已调整", cls: "bg-secondary/15 text-secondary border-secondary/30" },
};

export default function Profile({ setCurrentPage }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const [subjectCatalog, setSubjectCatalog] = useState([]);
  const [profileStatus, setProfileStatus] = useState("UNFILLED");

  const [examYear, setExamYear] = useState(2027);
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [examDate, setExamDate] = useState("2026-12-20");
  const [targetScore, setTargetScore] = useState(380);
  const [subjects, setSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(240);
  const [learningLevel, setLearningLevel] = useState("Intermediate");
  const [weakness, setWeakness] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([apiService.getSubjects(), apiService.getProfile()])
      .then(([catalog, prof]) => {
        if (!active) return;
        setSubjectCatalog(catalog || []);
        setProfileStatus(prof.profile_status || "UNFILLED");
        if (prof.exam_year) setExamYear(prof.exam_year);
        if (prof.school) setSchool(prof.school);
        if (prof.major) setMajor(prof.major);
        if (prof.exam_date) setExamDate(prof.exam_date);
        if (prof.target_score) setTargetScore(prof.target_score);
        if (Array.isArray(prof.subjects) && prof.subjects.length > 0) {
          setSubjects(prof.subjects);
        } else {
          setSubjects(["思想政治理论", "英语（一）", "数学（一）"]);
        }
        if (prof.daily_minutes) setDailyMinutes(prof.daily_minutes);
        if (prof.learning_level) setLearningLevel(prof.learning_level);
        if (prof.weakness) setWeakness(prof.weakness);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "加载考生档案失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleSubject = (name) => {
    setSubjects((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const addCustomSubject = (e) => {
    e.preventDefault();
    const cleaned = customSubject.trim();
    if (!cleaned) return;
    if (!subjects.includes(cleaned)) {
      setSubjects((prev) => [...prev, cleaned]);
    }
    setCustomSubject("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSavedNotice(false);

    if (!school.trim() || !major.trim()) {
      setError("请填写目标院校和目标专业。");
      return;
    }
    if (subjects.length === 0) {
      setError("请至少选择一门考试科目。");
      return;
    }
    if (Number(dailyMinutes) <= 0) {
      setError("每日可学习时长必须大于 0 分钟。");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiService.updateProfile({
        exam_year: Number(examYear),
        school: school.trim(),
        major: major.trim(),
        exam_date: examDate || null,
        target_score: targetScore ? Number(targetScore) : null,
        subjects,
        daily_minutes: Number(dailyMinutes),
        learning_level: learningLevel,
        weakness: weakness.trim(),
      });
      setProfileStatus(updated.profile_status);
      setSavedNotice(true);
    } catch (err) {
      setError(err.message || "保存考生画像失败");
    } finally {
      setSaving(false);
    }
  };

  const badge = STATUS_BADGE[profileStatus] || STATUS_BADGE.UNFILLED;

  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3 min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-text-muted">正在加载考生档案...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            考生档案画像
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            完善考研目标、科目与每日可用时长，AI 规划智能体将据此为你拆解阶段与每日学习任务。
          </p>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${badge.cls}`}>
          状态：{badge.label}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedNotice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>考生档案已保存至数据库，现在可以生成个性化考研规划了！</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage("planner")}
            className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 font-bold text-white cursor-pointer"
          >
            前往生成 AI 计划
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">考研年份</label>
            <input
              type="number"
              min="2025"
              max="2035"
              required
              value={examYear}
              onChange={(e) => setExamYear(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">目标院校</label>
            <input
              type="text"
              required
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="例如：浙江大学"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">目标专业</label>
            <input
              type="text"
              required
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="例如：计算机技术 / 电子信息"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">目标分数（100-500）</label>
            <input
              type="number"
              min="100"
              max="500"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">预计初试日期</label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="input-field [color-scheme:dark]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">每日可学习时长（分钟）</label>
            <input
              type="number"
              min="30"
              max="960"
              required
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">当前基础水平</label>
            <select
              value={learningLevel}
              onChange={(e) => setLearningLevel(e.target.value)}
              className="input-field bg-bg-dark"
            >
              <option value="Beginner">基础薄弱（Beginner）</option>
              <option value="Intermediate">中等稳步（Intermediate）</option>
              <option value="Advanced">基础扎实（Advanced）</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            考试科目（标签多选，也可补充自命题专业课）
          </label>
          <div className="flex flex-wrap gap-2">
            {subjectCatalog.map((item) => {
              const selected = subjects.includes(item.name);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSubject(item.name)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    selected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border-card bg-bg-dark/40 text-text-secondary hover:border-primary/40"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="补充其他自命题专业课（如：801经济学）"
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={addCustomSubject}
              className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/25 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              添加科目
            </button>
          </div>

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {subjects.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => toggleSubject(name)}
                    className="text-text-muted hover:text-accent cursor-pointer"
                    aria-label={`移除 ${name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">
            薄弱知识点描述（规划智能体将优先在前期安排高优先级突破任务）
          </label>
          <textarea
            rows={3}
            value={weakness}
            onChange={(e) => setWeakness(e.target.value)}
            placeholder="例如：多元微积分、操作系统死锁与虚拟内存、英语长难句拆解"
            className="input-field resize-y"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-card/30">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {saving ? "保存中..." : "保存考生档案"}
          </button>
        </div>
      </form>
    </div>
  );
}
