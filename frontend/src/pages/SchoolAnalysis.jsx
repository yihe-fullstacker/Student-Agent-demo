import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Loader2,
  School,
  Sparkles,
  Target,
} from "lucide-react";
import { apiService } from "../services/api";

export default function SchoolAnalysis() {
  const [targetSchool, setTargetSchool] = useState("");
  const [targetMajor, setTargetMajor] = useState("");
  const [targetScore, setTargetScore] = useState(375);
  const [currentLevel, setCurrentLevel] = useState("Intermediate");
  const [undergradBg, setUndergradBg] = useState("");
  const [regionPreference, setRegionPreference] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    let active = true;
    apiService
      .getProfile()
      .then((prof) => {
        if (!active || !prof) return;
        if (prof.school) setTargetSchool(prof.school);
        if (prof.major) setTargetMajor(prof.major);
        if (prof.target_score) setTargetScore(prof.target_score);
        if (prof.learning_level) setCurrentLevel(prof.learning_level);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetSchool.trim() || !targetMajor.trim()) {
      setError("请填写目标院校和目标专业。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiService.analyzeTargetSchool({
        target_school: targetSchool.trim(),
        target_major: targetMajor.trim(),
        target_score: targetScore ? Number(targetScore) : null,
        current_level: currentLevel,
        undergrad_bg: undergradBg.trim(),
        region_preference: regionPreference.trim(),
      });
      setReport(res);
    } catch (err) {
      setError(err.message || "生成择校分析失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <School className="h-5 w-5 text-primary" />
          择校与专业分析
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          结合你的考研画像与目标分数，由 PlanningAgent 评估报考竞争难度并给出冲/稳/保梯度建议。
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-4 h-fit"
        >
          <h3 className="text-sm font-bold text-text-primary border-b border-border-card/30 pb-3 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            择校评估参数
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">目标院校</label>
            <input
              type="text"
              required
              value={targetSchool}
              onChange={(e) => setTargetSchool(e.target.value)}
              placeholder="例如：浙江大学 / 南京大学"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">目标专业</label>
            <input
              type="text"
              required
              value={targetMajor}
              onChange={(e) => setTargetMajor(e.target.value)}
              placeholder="例如：计算机技术 / 软件工程"
              className="input-field"
            />
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-secondary">目标分数</label>
              <input
                type="number"
                min="100"
                max="500"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-secondary">当前基础</label>
              <select
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                className="input-field bg-bg-dark"
              >
                <option value="Beginner">基础薄弱</option>
                <option value="Intermediate">中等稳步</option>
                <option value="Advanced">基础扎实</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">本科背景（可选）</label>
            <input
              type="text"
              value={undergradBg}
              onChange={(e) => setUndergradBg(e.target.value)}
              placeholder="例如：双非一本软件工程 / 跨考"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">期望地区（可选）</label>
            <input
              type="text"
              value={regionPreference}
              onChange={(e) => setRegionPreference(e.target.value)}
              placeholder="例如：长三角 / 北京 / 成渝"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "智能分析中..." : "开始择校评估"}
          </button>
        </form>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3 min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-text-muted">正在评估目标院校竞争难度与推荐梯度...</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-card/30 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      {report.target_school} · {report.target_major}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">{report.score_reference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
                      难度：{report.difficulty_level}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                      {report.source === "llm" ? "AI 实时评估" : "基础评估模式"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border-card bg-bg-dark/30 p-4 text-xs text-text-secondary leading-relaxed">
                  <span className="font-bold text-text-primary">初试科目与参考建议：</span>
                  {report.exam_subjects_advice}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {report.tier_recommendations?.map((tier, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl border border-border-card bg-bg-card p-5 space-y-2.5"
                  >
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                      <Compass className="h-3.5 w-3.5" />
                      {tier.tier}
                    </span>
                    <ul className="space-y-1 text-xs font-bold text-text-primary">
                      {tier.schools.map((s, sIdx) => (
                        <li key={sIdx}>• {s}</li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{tier.reason}</p>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-3">
                <h3 className="text-sm font-bold text-text-primary">下一步行动建议</h3>
                <ul className="space-y-2">
                  {report.action_suggestions?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center space-y-2 min-h-[300px] flex flex-col justify-center">
              <School className="h-10 w-10 text-primary/60 mx-auto" />
              <p className="text-sm font-semibold text-text-primary">填写左侧参数生成择校分析报告</p>
              <p className="text-xs text-text-muted">系统已自动读取你的考生档案作为默认参数。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
