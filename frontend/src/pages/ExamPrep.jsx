import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { apiService } from "../services/api";

export default function ExamPrep({ setCurrentPage }) {
  const [mainTab, setMainTab] = useState("practice"); // practice | wrongbook

  // Subject & knowledge point catalog
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [kpId, setKpId] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [count, setCount] = useState(5);

  // Quiz state
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitResult, setSubmitResult] = useState(null);
  const [error, setError] = useState("");

  // Wrong book state
  const [loadingWrong, setLoadingWrong] = useState(false);
  const [wrongList, setWrongList] = useState([]);
  const [wrongFilterSubject, setWrongFilterSubject] = useState("");
  const [retryFeedback, setRetryFeedback] = useState({});

  const refreshWrongBook = async (filterSubjId = wrongFilterSubject) => {
    setLoadingWrong(true);
    try {
      const res = await apiService.getWrongList(
        filterSubjId ? Number(filterSubjId) : null,
        false
      );
      setWrongList(res.wrong_questions || []);
    } catch (err) {
      setError(err.message || "加载错题本失败");
    } finally {
      setLoadingWrong(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([apiService.getSubjects(), apiService.getWrongList(null, false)])
      .then(([subjRes, wrongRes]) => {
        if (!active) return;
        setSubjects(subjRes || []);
        if (subjRes && subjRes.length > 0) {
          setSubjectId(String(subjRes[0].id));
          if (subjRes[0].knowledge_points?.length > 0) {
            setKpId(String(subjRes[0].knowledge_points[0].id));
          }
        }
        setWrongList(wrongRes.wrong_questions || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "加载题库科目失败");
      });
    return () => {
      active = false;
    };
  }, []);

  const currentSubject = subjects.find((s) => String(s.id) === String(subjectId));
  const knowledgePoints = currentSubject?.knowledge_points || [];

  const handleSubjectChange = (nextId) => {
    setSubjectId(nextId);
    const matched = subjects.find((s) => String(s.id) === String(nextId));
    if (matched?.knowledge_points?.length > 0) {
      setKpId(String(matched.knowledge_points[0].id));
    } else {
      setKpId("");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");
    setLoadingQuiz(true);
    setQuizData(null);
    setSelectedAnswers({});
    setSubmitResult(null);
    try {
      const res = await apiService.generateExamQuiz({
        subject_id: subjectId ? Number(subjectId) : null,
        knowledge_point_id: kpId ? Number(kpId) : null,
        subject_name: currentSubject?.name || "",
        topic: customTopic.trim(),
        difficulty,
        count: Number(count),
      });
      setQuizData(res);
    } catch (err) {
      setError(err.message || "出题失败，请重试");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!quizData?.questions?.length) return;
    const unanswered = quizData.questions.filter((q) => selectedAnswers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`还有 ${unanswered.length} 道题未作答，请全部选择后再提交判分。`);
      return;
    }

    setSubmittingQuiz(true);
    setError("");
    try {
      const res = await apiService.submitExamAnswers({
        subject_id: quizData.subject_id,
        knowledge_point_id: quizData.knowledge_point_id,
        topic: quizData.topic,
        answers: quizData.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct_answer_index: q.correct_answer_index,
          user_answer_index: selectedAnswers[q.id],
          explanation: q.explanation,
        })),
      });
      setSubmitResult(res);
      await refreshWrongBook(wrongFilterSubject);
    } catch (err) {
      setError(err.message || "提交判分失败");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetryWrong = async (wrongId, optionIdx) => {
    setError("");
    try {
      const res = await apiService.retryWrongQuestion(wrongId, optionIdx);
      setRetryFeedback((prev) => ({ ...prev, [wrongId]: res }));
      if (res.is_correct) {
        await refreshWrongBook(wrongFilterSubject);
      }
    } catch (err) {
      setError(err.message || "错题重练失败");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            专项刷题与错题本
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            选择考研科目与知识点生成选择题，后端统一判分；答错自动进入错题本并反哺动态规划。
          </p>
        </div>

        <div className="flex rounded-xl border border-border-card bg-bg-card p-1">
          <button
            type="button"
            onClick={() => setMainTab("practice")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              mainTab === "practice" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            专项刷题
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("wrongbook");
              refreshWrongBook(wrongFilterSubject);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              mainTab === "wrongbook" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            错题本（{wrongList.length}）
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mainTab === "practice" ? (
        loadingQuiz ? (
          <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3 min-h-[280px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-text-muted">ExamAgent 正在围绕所选知识点出题...</p>
          </div>
        ) : quizData ? (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  {quizData.source === "llm" ? "AI 实时出题" : "基础题库模式"}
                </span>
                <h2 className="text-sm font-bold text-text-primary">{quizData.topic}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuizData(null);
                  setSubmitResult(null);
                  setSelectedAnswers({});
                }}
                className="rounded-xl border border-border-card bg-bg-dark/40 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
              >
                重新选题出题
              </button>
            </div>

            {submitResult && (
              <div className="glass-card rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-text-muted">判分结果</p>
                    <h3 className="text-lg font-bold text-text-primary">
                      得分 {submitResult.score} 分（正确 {submitResult.correct_count} / {submitResult.total_count} 题，正确率 {submitResult.accuracy_rate}%）
                    </h3>
                  </div>
                  {submitResult.wrong_saved_count > 0 && (
                    <button
                      type="button"
                      onClick={() => setMainTab("wrongbook")}
                      className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      查看收录的 {submitResult.wrong_saved_count} 道错题 →
                    </button>
                  )}
                </div>
                {submitResult.newly_marked_weak && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      该知识点错题已达到薄弱阈值，已自动标记为薄弱环节！
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage("planner")}
                      className="underline font-bold cursor-pointer"
                    >
                      前往动态调整加量复习
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {quizData.questions.map((q, idx) => {
                const selectedIdx = selectedAnswers[q.id];
                const detail = submitResult?.details?.find((d) => d.index === idx + 1);
                const isGraded = Boolean(detail);

                return (
                  <div
                    key={q.id}
                    className="glass-card rounded-2xl border border-border-card bg-bg-card p-5 space-y-3"
                  >
                    <div className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-primary font-bold text-[11px] mt-0.5">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-text-primary">{q.question}</h4>
                    </div>

                    <div className="grid gap-2 pl-7">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedIdx === optIdx;
                        const isCorrectOpt = detail && optIdx === detail.correct_answer_index;

                        let optClass =
                          "border-border-card bg-bg-dark/40 text-text-secondary hover:border-primary/40";
                        if (isGraded) {
                          if (isCorrectOpt) {
                            optClass = "border-success bg-success/10 text-success";
                          } else if (isSelected && !detail.is_correct) {
                            optClass = "border-accent bg-accent/10 text-accent";
                          } else {
                            optClass = "border-border-card/30 opacity-60 text-text-muted";
                          }
                        } else if (isSelected) {
                          optClass = "border-primary bg-primary/15 text-primary font-semibold";
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isGraded}
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className={`w-full text-left text-xs px-4 py-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${optClass}`}
                          >
                            <span>{opt}</span>
                            {isGraded && isCorrectOpt && <Check className="h-4 w-4 text-success" />}
                            {isGraded && isSelected && !isCorrectOpt && (
                              <X className="h-4 w-4 text-accent" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isGraded && (
                      <div className="ml-7 rounded-xl border border-border-card/50 bg-bg-dark/30 px-4 py-2.5 text-xs text-text-secondary">
                        <span className="font-bold text-text-primary">解析：</span>
                        {detail.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!submitResult && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submittingQuiz}
                  onClick={handleSubmitAnswers}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
                >
                  {submittingQuiz ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {submittingQuiz ? "判分中..." : "提交作答并判分"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleGenerate}
            className="glass-card rounded-2xl border border-border-card bg-bg-card p-6 space-y-5 max-w-2xl mx-auto"
          >
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              配置专项刷题参数
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">考研科目</label>
                <select
                  value={subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">关联知识点</label>
                <select
                  value={kpId}
                  onChange={(e) => setKpId(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  {knowledgePoints.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      {kp.name}
                    </option>
                  ))}
                  <option value="">自定义考点（在下方输入）</option>
                </select>
              </div>
            </div>

            {!kpId && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">自定义练习考点</label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="例如：TCP拥塞控制、拉格朗日中值定理"
                  className="input-field"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">题目难度</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input-field bg-bg-dark"
                >
                  <option value="Beginner">基础巩固（Beginner）</option>
                  <option value="Intermediate">真题强化（Intermediate）</option>
                  <option value="Advanced">难题拔高（Advanced）</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-text-secondary">
                  <span>题目数量</span>
                  <span className="text-primary font-bold">{count} 题</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full accent-primary mt-2 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover cursor-pointer"
            >
              生成专项练习题
            </button>
          </form>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={wrongFilterSubject}
              onChange={(e) => {
                const next = e.target.value;
                setWrongFilterSubject(next);
                refreshWrongBook(next);
              }}
              className="input-field bg-bg-dark max-w-xs"
            >
              <option value="">全部科目错题</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => refreshWrongBook(wrongFilterSubject)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-card bg-bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-card-hover cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              刷新错题本
            </button>
          </div>

          {loadingWrong ? (
            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-text-muted">正在加载错题本...</p>
            </div>
          ) : wrongList.length === 0 ? (
            <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-sm font-semibold text-text-primary">当前没有待复习的错题</p>
              <p className="text-xs text-text-muted">去专项刷题做几道题检验掌握情况吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wrongList.map((w) => {
                const fb = retryFeedback[w.id];
                return (
                  <div
                    key={w.id}
                    className="glass-card rounded-2xl border border-border-card bg-bg-card p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {w.subject_name}
                        </span>
                        {w.knowledge_point_name && (
                          <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">
                            {w.knowledge_point_name}
                          </span>
                        )}
                        <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                          累计错 {w.wrong_count} 次
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                        <RotateCcw className="h-3 w-3" />
                        点击选项直接重练
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-primary">{w.question}</h4>

                    <div className="grid gap-2">
                      {w.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleRetryWrong(w.id, optIdx)}
                          className="w-full text-left text-xs px-4 py-2 rounded-xl border border-border-card bg-bg-dark/40 text-text-secondary hover:border-primary/50 hover:text-text-primary transition cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {fb && (
                      <div
                        className={`rounded-xl border px-4 py-2.5 text-xs ${
                          fb.is_correct
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-accent/30 bg-accent/10 text-accent"
                        }`}
                      >
                        <p className="font-bold">
                          {fb.is_correct ? "回答正确！已移出待复习错题本。" : "仍然答错，错题计数 +1。"}
                        </p>
                        <p className="mt-1 text-text-secondary">解析：{fb.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
