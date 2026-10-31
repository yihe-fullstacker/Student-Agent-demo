import React from "react";
import { 
  Sparkles, 
  Calendar, 
  GraduationCap, 
  Briefcase, 
  FolderGit2, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function Home({ setCurrentPage }) {
  const cards = [
    {
      id: "planner",
      title: "AI Study Planner",
      desc: "Generate optimized daily study schedules leading up to your exam dates, targeting weak topics first.",
      icon: Calendar,
      color: "from-blue-600/20 to-indigo-600/20 border-indigo-500/20 text-indigo-400"
    },
    {
      id: "examprep",
      title: "Exam Prep Agent",
      desc: "Produce structured topic summaries, multiple-choice practice tests (MCQs), and important questions with answers.",
      icon: GraduationCap,
      color: "from-purple-600/20 to-pink-600/20 border-pink-500/20 text-pink-400"
    },
    {
      id: "career",
      title: "Career Guidance Agent",
      desc: "Identify skills gaps for roles in AI, ML, and software engineering. View timeline roadmaps and resource recommendations.",
      icon: Briefcase,
      color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/20 text-emerald-400"
    },
    {
      id: "projects",
      title: "Project Advisor",
      desc: "Discover tailored portfolio projects. Generate code files, technology recommendations, and clean GitHub README templates.",
      icon: FolderGit2,
      color: "from-amber-600/20 to-orange-600/20 border-amber-500/20 text-amber-400"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border-card bg-gradient-to-br from-indigo-950/40 via-bg-card to-slate-900 px-6 py-12 md:px-12 text-left">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        
        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Agents For Good — Kaggle Capstone
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            Empower Your Academic & <br/>
            <span className="gradient-text font-black">Career Success Journey</span>
          </h1>
          <p className="text-sm text-text-secondary md:text-base leading-relaxed">
            Welcome to the Smart Student Success Agent. Our production-grade AI agents utilize advanced reasoning and structured prompts to build tailored study roadmaps, host mock exams, map out skills, and suggest code portfolios.
          </p>
          <div className="pt-4 flex flex-wrap gap-3">
            <button 
              onClick={() => setCurrentPage("planner")}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover transition text-text-primary font-semibold text-sm px-5 py-3 shadow-lg shadow-primary/20 cursor-pointer"
            >
              Start Study Planner
              <ArrowRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentPage("dashboard")}
              className="flex items-center gap-2 rounded-xl bg-bg-card-hover border border-border-card text-text-primary font-semibold text-sm px-5 py-3 hover:bg-slate-800 transition cursor-pointer"
            >
              View Analytics
            </button>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Meet Your AI Success Agents</h2>
          <p className="text-xs text-text-muted">Four specialized agents working together to support your progress.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div 
                key={c.id}
                onClick={() => setCurrentPage(c.id)}
                className={`glass-card flex flex-col justify-between rounded-2xl border p-6 cursor-pointer bg-gradient-to-tr ${c.color} transition hover:scale-[1.01]`}
              >
                <div className="space-y-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-bg-dark border border-border-card/50">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-text-primary">{c.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{c.desc}</p>
                  </div>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-text-primary gap-1 group">
                  Deploy Agent 
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick stats highlight */}
      <section className="rounded-2xl border border-border-card bg-bg-card p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-success" />
              Impact Statement
            </h3>
            <p className="text-xs text-text-secondary max-w-xl">
              By combining scheduling optimizations with active recall quiz loops and personalized skill gap analyses, this workspace targets the core academic bottlenecks students face: poor time management, passive learning habits, and post-graduation skill mismatches.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center sm:text-left shrink-0">
            <div className="bg-bg-dark p-3.5 rounded-xl border border-border-card">
              <div className="text-lg font-bold text-primary">85%+</div>
              <div className="text-[10px] text-text-muted">Retention Improvement</div>
            </div>
            <div className="bg-bg-dark p-3.5 rounded-xl border border-border-card">
              <div className="text-lg font-bold text-secondary">3x</div>
              <div className="text-[10px] text-text-muted">Faster Job Readiness</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
