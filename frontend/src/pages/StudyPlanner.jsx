import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Bookmark, 
  Award,
  AlertCircle
} from "lucide-react";
import { apiService } from "../services/api";

const translateGeneratedText = (text) => {
  if (!text) return text;

  const replacements = [
    [/^Master (.+) and complete practice exercises\.$/i, "掌握 $1，并完成练习题。"],
    [/^Read study guides or textbooks on (.+)$/i, "阅读关于 $1 的学习指南或教材"],
    [/^Solve 5 practice problems on (.+)$/i, "完成 5 道关于 $1 的练习题"],
    [/^Write summary notes for (.+)$/i, "为 $1 整理总结笔记"],
    [/^Complete fundamentals of (.+) and solve introductory assignments\.$/i, "完成 $1 的基础内容并解答入门练习。"],
    [/^Complete review and exercises for weak topics: (.+)\.$/i, "复习并完成以下薄弱主题的练习：$1。"],
    [/^Achieve >80% on mock quizzes and complete the revision checklist\.$/i, "模拟测验正确率达到 80% 以上，并完成复习清单。"],
    [/^Review summary notes for all key chapters of (.+)$/i, "复习 $1 各重点章节的总结笔记"],
    [/^Spend extra time reviewing notes on (.+)$/i, "额外安排时间复习以下主题笔记：$1"],
    [/^Take at least two full-length mock exams$/i, "至少完成两套完整的模拟考试"],
    [/^Ensure all formulas and definitions are memorized$/i, "确保熟记所有公式和定义"],
    [/^Review mistake logs from practice quizzes$/i, "回顾练习测验中的错题记录"],
  ];

  const matched = replacements.find(([pattern]) => pattern.test(text));
  return matched ? text.replace(matched[0], matched[1]) : text;
};

export default function StudyPlanner() {
  // Form state
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(2);
  const [weakTopics, setWeakTopics] = useState([]);
  const [topicInput, setTopicInput] = useState("");
  const [level, setLevel] = useState("Intermediate");

  // App state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [studyPlan, setStudyPlan] = useState(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [completedTasks, setCompletedTasks] = useState([]); // Array of strings: "week-day"

  const loadingMessages = [
    "正在搭建学习日历...",
    "正在整理主题学习指南...",
    "正在分配重点与薄弱内容...",
    "正在生成学习活动清单...",
    "准备完成！"
  ];

  // Load existing plan from local storage on mount
  useEffect(() => {
    const cachedPlan = localStorage.getItem("active_study_plan");
    const cachedCompleted = localStorage.getItem("completed_study_tasks");
    
    if (cachedPlan) {
      try {
        const plan = JSON.parse(cachedPlan);
        setStudyPlan(plan);
        setSubject(plan.subject_name || "");
      } catch (e) {}
    }

    if (cachedCompleted) {
      try {
        setCompletedTasks(JSON.parse(cachedCompleted));
      } catch (e) {}
    }
  }, []);

  // Set up loading indicator timer loop
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingMessages.length - 2 ? prev + 1 : prev));
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const addWeakTopic = (e) => {
    e.preventDefault();
    if (topicInput.trim() && !weakTopics.includes(topicInput.trim())) {
      setWeakTopics([...weakTopics, topicInput.trim()]);
      setTopicInput("");
    }
  };

  const removeWeakTopic = (topicToRemove) => {
    setWeakTopics(weakTopics.filter((t) => t !== topicToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !examDate) return;

    setLoading(true);
    setLoadingStep(0);

    try {
      const res = await apiService.generateStudyPlan({
        subject_name: subject,
        exam_date: examDate,
        weak_topics: weakTopics.length > 0 ? weakTopics : ["Fundamental concepts"],
        daily_hours: parseFloat(dailyHours),
        current_level: level
      });

      setStudyPlan(res);
      setActiveWeek(1);
      setCompletedTasks([]);
      
      // Cache values
      localStorage.setItem("active_study_plan", JSON.stringify(res));
      localStorage.setItem("completed_study_tasks", JSON.stringify([]));
      localStorage.setItem("planner_subject", subject);
    } catch (error) {
      console.error(error);
      alert("无法连接智能代理，请检查密钥或稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  // Toggle a study task status
  const toggleTask = (weekNum, dayName) => {
    const taskId = `${weekNum}-${dayName}`;
    let newCompleted;
    if (completedTasks.includes(taskId)) {
      newCompleted = completedTasks.filter((id) => id !== taskId);
    } else {
      newCompleted = [...completedTasks, taskId];
    }
    setCompletedTasks(newCompleted);
    localStorage.setItem("completed_study_tasks", JSON.stringify(newCompleted));
  };

  const deletePlan = () => {
    if (window.confirm("确定要清除当前学习计划并重置进度吗？")) {
      setStudyPlan(null);
      setCompletedTasks([]);
      localStorage.removeItem("active_study_plan");
      localStorage.removeItem("completed_study_tasks");
      localStorage.removeItem("planner_subject");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Introduction */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">AI Study Planner Agent</h1>
        <p className="text-xs text-text-secondary">根据你的薄弱环节和考试日期，生成并跟踪专属学习时间表。</p>
      </div>

      {loading ? (
        /* Loading Screen */
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">智能代理正在生成学习日历...</h3>
            <p className="text-xs text-text-muted">{loadingMessages[loadingStep]}</p>
          </div>
        </div>
      ) : studyPlan ? (
        /* Active Study Plan Display */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main schedule panels */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-card/30">
                <div>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Active Plan</span>
                  <h2 className="text-lg font-bold text-text-primary">{studyPlan.subject_name}</h2>
                </div>
                <button 
                  onClick={deletePlan} 
                  className="text-xs bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  Clear Plan
                </button>
              </div>

              {/* Week selectors tabs */}
              <div className="flex gap-2 border-b border-border-card/20 pb-3 overflow-x-auto whitespace-nowrap scrollbar-none">
                {studyPlan.weekly_schedule.map((week) => (
                  <button
                    key={week.week_number}
                    onClick={() => setActiveWeek(week.week_number)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                      activeWeek === week.week_number
                        ? "bg-primary text-white"
                        : "text-text-secondary hover:bg-bg-card-hover"
                    }`}
                  >
                    Week {week.week_number}
                  </button>
                ))}
              </div>

              {/* Active Week Goal */}
              <div className="bg-bg-dark/40 border border-border-card rounded-xl p-4">
                <h4 className="text-xs font-bold text-secondary flex items-center gap-1.5 mb-1">
                  <Award className="h-4 w-4" />
                  Weekly Target Goal
                </h4>
                <p className="text-xs text-text-secondary">
                  {translateGeneratedText(studyPlan.weekly_schedule.find(w => w.week_number === activeWeek)?.weekly_goal)}
                </p>
              </div>

              {/* Day lists */}
              <div className="space-y-4">
                {studyPlan.weekly_schedule
                  .find((w) => w.week_number === activeWeek)
                  ?.days.map((day, dIdx) => {
                    const taskId = `${activeWeek}-${day.day_name}`;
                    const isCompleted = completedTasks.includes(taskId);
                    return (
                      <div 
                        key={dIdx} 
                        className={`border rounded-xl p-4 transition-all duration-200 bg-bg-dark/20 ${
                          isCompleted ? "border-success/30 bg-success/5" : "border-border-card/60"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            <span className="text-[10px] text-text-muted font-bold">{day.day_name}</span>
                            <h4 className="text-sm font-bold text-text-primary">{day.topic}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              day.priority === "High" ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
                            }`}>
                              {day.priority}
                            </span>
                            <span className="text-[10px] text-text-muted">{day.duration_hours} 小时</span>
                          </div>
                        </div>

                        {/* Subtopics */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {day.subtopics.map((st, sIdx) => (
                            <span key={sIdx} className="text-[9px] bg-bg-card-hover text-text-secondary border border-border-card/40 px-2 py-0.5 rounded">
                              {st}
                            </span>
                          ))}
                        </div>

                        {/* Checklist */}
                        <div className="space-y-2 pl-1 border-t border-border-card/20 pt-3">
                          {day.activities.map((act, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-2 text-xs text-text-secondary">
                              <span className="h-1 w-1 rounded-full bg-primary" />
                              <span>{translateGeneratedText(act)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Mark complete checkbox */}
                        <button
                          onClick={() => toggleTask(activeWeek, day.day_name)}
                          className={`mt-4 w-full flex items-center justify-center gap-2 border text-xs font-semibold py-2 rounded-lg transition cursor-pointer ${
                            isCompleted
                              ? "bg-success/15 border-success/35 text-success hover:bg-success/20"
                              : "border-border-card hover:bg-bg-card-hover text-text-secondary"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isCompleted ? "已完成！" : "将当天任务标记为完成"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Sidebar Stats and checklists */}
          <div className="space-y-6">
            {/* Timeline Milestones */}
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                <Bookmark className="h-4.5 w-4.5 text-primary" />
                Major Milestones
              </h3>
              <div className="space-y-4 relative pl-3 border-l border-border-card/60 ml-2">
                {studyPlan.milestones.map((ms, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <span className="text-[9px] text-primary font-bold">{ms.target_date}</span>
                      <h4 className="text-xs font-bold text-text-primary">{ms.title}</h4>
                      <p className="text-[10px] text-text-secondary leading-normal">{translateGeneratedText(ms.description)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General exam readiness checklist */}
            <div className="glass-card rounded-2xl border p-6 bg-bg-card space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 pb-2 border-b border-border-card/30">
                <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                Readiness Checklist
              </h3>
              <ul className="space-y-3">
                {studyPlan.exam_readiness_checklist.map((item, idx) => (
                  <li key={idx} className="flex gap-2 items-start text-xs text-text-secondary">
                    <CheckCircle2 className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                    <span>{translateGeneratedText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Form creation view */
        <div className="glass-card rounded-2xl border p-6 bg-bg-card max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-card/30 pb-3">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Configure Study Target
            </h3>

            {/* Subject name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">科目名称</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例如：Data Structures、Applied Physics、Software Engineering"
                className="input-field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Exam Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">考试日期</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="input-field [color-scheme:dark]"
                />
              </div>

              {/* Study Hours */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">每日学习时长（小时）</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Current Proficiency level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">当前学习水平</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-field bg-bg-dark"
              >
                <option value="Beginner">初级（基础薄弱）</option>
                <option value="Intermediate">中级（理解概念，需要加强练习）</option>
                <option value="Advanced">高级（知识扎实，正在冲刺高分）</option>
              </select>
            </div>

            {/* Weak Topics */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">薄弱主题（重点攻克）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="例如：Tree Traversal、Normalization、Git Merge"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addWeakTopic}
                  className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/35 transition px-3 rounded-lg flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Topic tags list */}
              {weakTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 bg-bg-dark/40 border border-border-card/50 p-2.5 rounded-xl">
                  {weakTopics.map((topic, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary text-xs font-semibold px-2.5 py-1 rounded-lg"
                    >
                      {topic}
                      <button 
                        type="button" 
                        onClick={() => removeWeakTopic(topic)}
                        className="text-text-secondary hover:text-accent font-bold"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info warning */}
            <div className="flex gap-2 items-start bg-blue-500/10 border border-blue-500/25 p-3 rounded-xl text-[10px] text-blue-300">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <p>学习计划工具会使用 Gemini AI 合理安排每周任务。前期重点梳理薄弱环节中的定义与练习题，后期逐步转向限时模拟测试。</p>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover font-semibold text-sm text-white py-3 rounded-xl shadow-lg shadow-primary/20 transition cursor-pointer"
            >
              生成学习计划
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
