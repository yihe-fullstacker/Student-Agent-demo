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
    "Scaffolding calendar grids...",
    "Injecting topic guidelines...",
    "Structuring weak points distribution...",
    "Generating study activities checklist...",
    "Ready!"
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
      alert("Failed to connect to agent. Please verify key or try again.");
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
    if (window.confirm("Are you sure you want to clear this study plan and reset progress?")) {
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
        <p className="text-xs text-text-secondary">Generate and track custom study timelines tailored specifically to your weak areas and exam date.</p>
      </div>

      {loading ? (
        /* Loading Screen */
        <div className="glass-card rounded-2xl border border-border-card bg-bg-card p-12 text-center flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">Agent is composing study calendar...</h3>
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
                        ? "bg-primary text-text-primary"
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
                  {studyPlan.weekly_schedule.find(w => w.week_number === activeWeek)?.weekly_goal}
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
                            <span className="text-[10px] text-text-muted">{day.duration_hours}h</span>
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
                              <span>{act}</span>
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
                          {isCompleted ? "Completed!" : "Mark Day as Complete"}
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
                      <p className="text-[10px] text-text-secondary leading-normal">{ms.description}</p>
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
                    <span>{item}</span>
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
              <label className="text-xs font-semibold text-text-secondary">Subject Name</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Structures, Applied Physics, Software Engineering"
                className="input-field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Exam Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Exam Date</label>
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
                <label className="text-xs font-semibold text-text-secondary">Daily Study Limit (Hours)</label>
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
              <label className="text-xs font-semibold text-text-secondary">Your Current Proficiency</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-field bg-bg-dark"
              >
                <option value="Beginner">Beginner (Struggling with fundamentals)</option>
                <option value="Intermediate">Intermediate (Understand concepts, need problem practice)</option>
                <option value="Advanced">Advanced (Deep knowledge, revising for high grades)</option>
              </select>
            </div>

            {/* Weak Topics */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Weak Topics (Target Areas)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Tree Traversal, Normalization, Git Merge"
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
              <p>The planner uses Gemini AI to balance your weeks. It focuses the first half on identifying definitions and practice problems for weak spots, before shifting towards timed mock tests.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover font-semibold text-sm text-text-primary py-3 rounded-xl shadow-lg shadow-primary/20 transition cursor-pointer"
            >
              Compose Study Schedule
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
