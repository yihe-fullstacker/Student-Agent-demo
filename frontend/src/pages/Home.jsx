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
      title: "学习计划",
      desc: "围绕考试日期生成优化的每日学习安排，并优先处理薄弱主题。",
      icon: Calendar,
      color: "from-blue-600/20 to-indigo-600/20 border-indigo-500/20 text-indigo-400"
    },
    {
      id: "examprep",
      title: "考试备考智能代理",
      desc: "生成结构化的主题总结、选择题练习和带参考答案的重点问题。",
      icon: GraduationCap,
      color: "from-purple-600/20 to-pink-600/20 border-pink-500/20 text-pink-400"
    },
    {
      id: "career",
      title: "职业指导智能代理",
      desc: "分析 AI、机器学习和软件工程岗位所需的能力差距，查看成长路线和资源建议。",
      icon: Briefcase,
      color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/20 text-emerald-400"
    },
    {
      id: "projects",
      title: "项目推荐顾问",
      desc: "发现适合你的作品集项目，并生成技术选型建议和规范的 GitHub README 模板。",
      icon: FolderGit2,
      color: "from-amber-600/20 to-orange-600/20 border-amber-500/20 text-amber-400"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border-card bg-gradient-to-br from-indigo-50 via-white to-slate-100 px-6 py-12 md:px-12 text-left">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        
        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            公益智能代理 — Kaggle 毕业项目
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            赋能你的学业与 <br/>
            <span className="gradient-text font-black">职业成功之旅</span>
          </h1>
          <p className="text-sm text-text-secondary md:text-base leading-relaxed">
            欢迎使用 Smart Student Success Agent。我们的 AI 智能代理会通过结构化推理，为你制定专属学习路线、组织模拟考试、分析能力差距并推荐编程作品集项目。
          </p>
          <div className="pt-4 flex flex-wrap gap-3">
            <button 
              onClick={() => setCurrentPage("planner")}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover transition text-white font-semibold text-sm px-5 py-3 shadow-lg shadow-primary/20 cursor-pointer"
            >
              开始制定学习计划
              <ArrowRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentPage("dashboard")}
              className="flex items-center gap-2 rounded-xl bg-white border border-border-card text-text-primary font-semibold text-sm px-5 py-3 hover:bg-slate-100 transition cursor-pointer"
            >
              查看学习分析
            </button>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">认识你的人工智能成功代理</h2>
          <p className="text-xs text-text-muted">四个专业智能代理协同工作，帮助你持续进步。</p>
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
                  使用该智能代理
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
              成效说明
            </h3>
            <p className="text-xs text-text-secondary max-w-xl">
              通过优化学习安排、主动回忆测验和个性化能力差距分析，本平台重点解决学生常见的核心问题：时间管理不足、被动学习习惯，以及毕业后的技能错配。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center sm:text-left shrink-0">
            <div className="bg-bg-dark p-3.5 rounded-xl border border-border-card">
              <div className="text-lg font-bold text-primary">85%+</div>
              <div className="text-[10px] text-text-muted">知识留存提升</div>
            </div>
            <div className="bg-bg-dark p-3.5 rounded-xl border border-border-card">
              <div className="text-lg font-bold text-secondary">3 倍</div>
              <div className="text-[10px] text-text-muted">更快达到岗位要求</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
