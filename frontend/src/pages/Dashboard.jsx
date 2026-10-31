import { useState } from "react";
import { 
  CheckSquare, 
  Clock, 
  Award, 
  Lightbulb, 
  Calendar,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Target,
  Flame,
  Brain,
  ChevronRight
} from "lucide-react";

export default function Dashboard({ setCurrentPage }) {
  const [plannerData] = useState(() => {
    const storedPlan = localStorage.getItem("active_study_plan");
    try {
      return storedPlan ? JSON.parse(storedPlan) : null;
    } catch {
      return null;
    }
  });
  const [completedTaskIds] = useState(() => {
    const storedTasks = localStorage.getItem("completed_study_tasks");
    try {
      return storedTasks ? JSON.parse(storedTasks) : [];
    } catch {
      return [];
    }
  });
  const [stats] = useState(() => {
    const storedProjects = localStorage.getItem("saved_projects_count");
    const storedQuizzes = localStorage.getItem("quiz_scores");
    let totalTasks = 0;
    let completedCount = completedTaskIds.length;
    let hours = 0;

    if (plannerData?.weekly_schedule) {
      plannerData.weekly_schedule.forEach(week => {
        if (week.days) {
          week.days.forEach(day => {
            totalTasks += 1;
            if (completedTaskIds.includes(`${week.week_number}-${day.day_name}`)) {
              hours += day.duration_hours;
            }
          });
        }
      });
    } else {
      // Sample defaults if empty
      totalTasks = 12;
      completedCount = 4;
      hours = 12.5;
    }

    let avgQuiz = 82;
    if (storedQuizzes) {
      try {
        const scores = JSON.parse(storedQuizzes);
        if (scores.length > 0) {
          avgQuiz = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      } catch {
        avgQuiz = 82;
      }
    }

    return {
      studyHours: parseFloat(hours.toFixed(1)),
      completedTasksCount: completedCount,
      totalTasksCount: totalTasks,
      quizScoreAverage: avgQuiz,
      recommendedProjects: storedProjects ? parseInt(storedProjects, 10) : 1
    };
  });

  // Filter tasks to show today's agenda (or a list of pending tasks)
  const getPendingAgenda = () => {
    if (!plannerData || !plannerData.weekly_schedule) return [];
    
    const list = [];
    plannerData.weekly_schedule.forEach(week => {
      week.days.forEach(day => {
        const taskId = `${week.week_number}-${day.day_name}`;
        const isDone = completedTaskIds.includes(taskId);
        if (!isDone) {
          list.push({
            id: taskId,
            weekNum: week.week_number,
            dayName: day.day_name,
            topic: day.topic,
            activity: day.activities[0] || "Study core concepts",
            priority: day.priority
          });
        }
      });
    });
    return list.slice(0, 4); // limit to 4 items
  };

  const pendingAgenda = getPendingAgenda();
  const completionPercentage = stats.totalTasksCount > 0 
    ? Math.round((stats.completedTasksCount / stats.totalTasksCount) * 100) 
    : 0;

  const weeklyAnalytics = plannerData?.weekly_schedule?.map((week) => {
    const plannedHours = week.days.reduce((sum, day) => sum + Number(day.duration_hours || 0), 0);
    const completedDays = week.days.filter((day) => completedTaskIds.includes(`${week.week_number}-${day.day_name}`)).length;
    const completedHours = week.days.reduce((sum, day) => (
      completedTaskIds.includes(`${week.week_number}-${day.day_name}`)
        ? sum + Number(day.duration_hours || 0)
        : sum
    ), 0);

    return {
      label: `Week ${week.week_number}`,
      plannedHours,
      completedHours,
      completedDays,
      completion: plannedHours ? Math.round((completedHours / plannedHours) * 100) : 0
    };
  }) || [
    { label: "Week 1", plannedHours: 10, completedHours: 7, completedDays: 2, completion: 70 },
    { label: "Week 2", plannedHours: 12, completedHours: 9, completedDays: 2, completion: 75 },
    { label: "Week 3", plannedHours: 14, completedHours: 8, completedDays: 2, completion: 57 },
    { label: "Week 4", plannedHours: 16, completedHours: 12, completedDays: 3, completion: 75 }
  ];

  const strongestWeek = weeklyAnalytics.reduce((best, week) => (
    week.completion > best.completion ? week : best
  ), weeklyAnalytics[0]);
  const totalPlannedHours = weeklyAnalytics.reduce((sum, week) => sum + week.plannedHours, 0);
  const consistencyScore = totalPlannedHours
    ? Math.round((weeklyAnalytics.reduce((sum, week) => sum + week.completedHours, 0) / totalPlannedHours) * 100)
    : 0;
  const focusScore = Math.min(100, Math.round((stats.quizScoreAverage * 0.6) + (completionPercentage * 0.4)));
  const maxHours = Math.max(...weeklyAnalytics.map((week) => week.plannedHours), 1);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Learning analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Your progress, in focus.</h1>
          <p className="mt-1 text-xs text-text-secondary">A clear read on your study rhythm, follow-through, and next best move.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-[10px] font-bold text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          {stats.completedTasksCount > 0 ? "Momentum is building" : "Ready to begin"}
        </div>
      </div>

      {/* Stats Widgets */}
      <section className="grid gap-6 grid-cols-2 lg:grid-cols-4">
        {/* Hours Studied */}
        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Hours Studied</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.studyHours}h</h3>
            <p className="text-[10px] text-text-secondary">Logged from planner</p>
          </div>
        </div>

        {/* Tasks Checklist */}
        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Tasks Complete</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.completedTasksCount}/{stats.totalTasksCount}</h3>
            <p className="text-[10px] text-text-secondary">{completionPercentage}% progress rate</p>
          </div>
        </div>

        {/* Quiz Avg */}
        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Quiz Score Avg</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.quizScoreAverage}%</h3>
            <p className="text-[10px] text-text-secondary">Based on mock tests</p>
          </div>
        </div>

        {/* Saved Projects */}
        <div className="glass-card rounded-2xl border p-5 flex items-center gap-4 bg-bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Suggested Projects</p>
            <h3 className="text-xl font-bold text-text-primary">{stats.recommendedProjects}</h3>
            <p className="text-[10px] text-text-secondary">Active in portfolio</p>
          </div>
        </div>
      </section>

      {/* Grid Layout for Graphs & Agenda */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly performance chart */}
        <div className="glass-card lg:col-span-2 rounded-2xl border p-6 bg-bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                Weekly Performance Activity
              </h3>
              <p className="text-[10px] text-text-muted">Visualizing learning intensity (target hours vs completed)</p>
            </div>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-1 rounded">{weeklyAnalytics.length} week view</span>
          </div>

          <div className="flex h-48 items-end gap-3 border-b border-border-card/30 px-2 py-3 sm:gap-6">
            {weeklyAnalytics.map((week) => (
              <div key={week.label} className="group relative flex h-full flex-1 items-end justify-center gap-1.5">
                <div className="relative flex h-full w-3 items-end rounded-t bg-primary/15 sm:w-5" style={{ height: `${Math.max(12, (week.plannedHours / maxHours) * 100)}%` }}>
                  <div className="w-full rounded-t bg-primary transition-all duration-500 group-hover:bg-primary-hover" style={{ height: `${week.completion}%` }} />
                </div>
                <div className="relative flex h-full w-3 items-end rounded-t bg-success/15 sm:w-5" style={{ height: `${Math.max(12, (week.completedHours / maxHours) * 100)}%` }}>
                  <div className="w-full rounded-t bg-success transition-all duration-500" style={{ height: "100%" }} />
                </div>
                <span className="absolute -bottom-7 text-[9px] text-text-muted">{week.label.replace("Week ", "W")}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center text-[10px] text-text-secondary pt-3 border-t border-border-card/20">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              Assigned Tasks Target
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Completed Tasks
            </span>
          </div>
        </div>

        {/* Agenda / Upcoming study tasks */}
        <div className="glass-card rounded-2xl border p-6 bg-bg-card flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-card/30">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-secondary" />
                Next Up Agenda
              </h3>
              <span className="text-[10px] text-text-muted">{pendingAgenda.length} tasks pending</span>
            </div>

            {pendingAgenda.length > 0 ? (
              <div className="space-y-3">
                {pendingAgenda.map((item, idx) => (
                  <div key={idx} className="bg-bg-dark/40 border border-border-card p-3 rounded-xl flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-wider">Week {item.weekNum} - {item.dayName}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        item.priority === "High" ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-text-primary truncate">{item.topic}</h4>
                    <p className="text-[10px] text-text-secondary line-clamp-1">{item.activity}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-text-muted" />
                <div>
                  <p className="text-xs font-bold text-text-secondary">No active study plan loaded</p>
                  <p className="text-[10px] text-text-muted max-w-[200px]">Use the study planner agent to map out schedules.</p>
                </div>
                <button
                  onClick={() => setCurrentPage("planner")}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5 transition cursor-pointer"
                >
                  Create Plan Now
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          
          {plannerData && (
            <button
              onClick={() => setCurrentPage("planner")}
              className="w-full text-center text-xs font-bold text-text-secondary hover:text-text-primary py-2.5 mt-4 border-t border-border-card/30"
            >
              Open Study Planner checklist
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-2xl border p-6 bg-bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border-card/30 pb-4">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-text-primary"><Target className="h-4 w-4 text-primary" /> Skill-building signals</h3>
              <p className="mt-1 text-[10px] text-text-muted">Small indicators that show whether your routine is working.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div className="grid gap-4 pt-5 sm:grid-cols-3">
            <div className="rounded-xl border border-border-card bg-bg-dark/30 p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Consistency</span><span className="text-xs font-bold text-success">{consistencyScore}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-card-hover"><div className="h-full rounded-full bg-success" style={{ width: `${consistencyScore}%` }} /></div>
              <p className="mt-2 text-[10px] text-text-secondary">Plan completion across all weeks</p>
            </div>
            <div className="rounded-xl border border-border-card bg-bg-dark/30 p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Focus score</span><span className="text-xs font-bold text-secondary">{focusScore}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-card-hover"><div className="h-full rounded-full bg-secondary" style={{ width: `${focusScore}%` }} /></div>
              <p className="mt-2 text-[10px] text-text-secondary">Quiz results plus task follow-through</p>
            </div>
            <div className="rounded-xl border border-border-card bg-bg-dark/30 p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Best week</span><Flame className="h-4 w-4 text-warning" /></div>
              <p className="text-lg font-bold text-text-primary">{strongestWeek?.label || "No data"}</p>
              <p className="mt-1 text-[10px] text-text-secondary">{strongestWeek?.completion || 0}% of planned hours completed</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border p-6 bg-bg-card">
          <h3 className="flex items-center gap-1.5 border-b border-border-card/30 pb-4 text-sm font-bold text-text-primary"><Brain className="h-4 w-4 text-secondary" /> Next best move</h3>
          <div className="space-y-4 pt-5">
            <p className="text-sm font-semibold leading-relaxed text-text-primary">
              {completionPercentage >= 80 ? "Keep your rhythm and raise the challenge slightly." : "Complete one pending study block to lift your momentum."}
            </p>
            <p className="text-xs leading-relaxed text-text-secondary">{pendingAgenda[0]?.activity || "Create a study plan to turn your goals into measurable progress."}</p>
            <button onClick={() => setCurrentPage("planner")} className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/20">
              {pendingAgenda.length ? "Continue study plan" : "Create your first plan"}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
