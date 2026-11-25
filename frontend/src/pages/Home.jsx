import {
  ArrowRight,
  Calendar,
  CheckSquare,
  GraduationCap,
  School,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";

export default function Home({ setCurrentPage }) {
  const cards = [
    {
      id: "profile",
      title: "考生档案画像",
      desc: "设置考研年份、目标院校/专业、报考科目、基础水平与薄弱知识点，作为个性化规划的起点。",
      icon: UserCheck,
      color: "from-sky-600/20 to-indigo-600/20 border-sky-500/20 text-sky-400",
    },
    {
      id: "planner",
      title: "AI 考研规划与动态调整",
      desc: "由 PlanningAgent 生成基础—强化—冲刺分层计划，并根据逾期与错题动态重排最新版本。",
      icon: Calendar,
      color: "from-blue-600/20 to-indigo-600/20 border-indigo-500/20 text-indigo-400",
    },
    {
      id: "today",
      title: "今日学习任务与打卡",
      desc: "查看每日拆解任务与逾期补做提醒，打卡后自动沉淀学习时长与掌握度自评反馈。",
      icon: CheckSquare,
      color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/20 text-emerald-400",
    },
    {
      id: "examprep",
      title: "专项刷题与错题本",
      desc: "由 ExamAgent 按科目与知识点出题并统一判分，自动收录错题并统计薄弱环节反哺规划。",
      icon: GraduationCap,
      color: "from-purple-600/20 to-pink-600/20 border-pink-500/20 text-pink-400",
    },
    {
      id: "school",
      title: "择校与专业分析",
      desc: "结合目标分数与当前基础评估报考竞争难度，提供冲刺、稳妥、保底三档院校梯度建议。",
      icon: School,
      color: "from-amber-600/20 to-orange-600/20 border-amber-500/20 text-amber-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-border-card bg-gradient-to-br from-indigo-50 via-white to-slate-100 px-6 py-12 md:px-12 text-left">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            智能考研规划 Agent 系统
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-5xl">
            规划 · 执行 · 反馈 <br />
            <span className="gradient-text font-black">动态闭环助力考研上岸</span>
          </h1>
          <p className="text-sm text-text-secondary md:text-base leading-relaxed">
            由 PlanningAgent、ExamAgent 与 AssistantAgent 三大智能体协同驱动，打通「建立画像 → 分层规划 → 每日打卡 → 刷题错题 → 动态重排」完整备考闭环。
          </p>
          <div className="pt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage("profile")}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover transition text-white font-semibold text-sm px-5 py-3 shadow-lg shadow-primary/20 cursor-pointer"
            >
              完善考生档案
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage("dashboard")}
              className="flex items-center gap-2 rounded-xl bg-white border border-border-card text-text-primary font-semibold text-sm px-5 py-3 hover:bg-slate-100 transition cursor-pointer"
            >
              进入考研仪表盘
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">五大考研核心工作台</h2>
          <p className="text-xs text-text-muted">点击任意卡片直达对应模块，右下角可随时唤起 RAG 考研知识问答助手。</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  立即进入
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border-card bg-bg-card p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-success" />
              全周期闭环机制
            </h3>
            <p className="text-xs text-text-secondary max-w-2xl">
              系统持续追踪每日任务完成状态、学习反馈自评以及刷题错题累计次数。一旦连续逾期或单一知识点错误达到阈值，PlanningAgent 会保留历史版本并重排最新可执行计划。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center sm:text-left shrink-0">
            <div className="bg-bg-dark p-3.5 rounded-xl border border-border-card">
              <div className="text-lg font-bold text-primary">3 大 Agent</div>
              <div className="text-[10px] text-text-muted">规划 · 刷题 · 问答协同</div>
            </div>
            <div className="bg-bg-dark p-3.5 rounded-xl border border-border-card">
              <div className="text-lg font-bold text-secondary">16 周</div>
              <div className="text-[10px] text-text-muted">分阶段动态重排追踪</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
