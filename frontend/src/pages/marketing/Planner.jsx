import { motion } from "motion/react";
import { Target, Clock, Route as RouteIcon, RefreshCw } from "lucide-react";
import PageHeader from "../../components/marketing/PageHeader";
import EnterAppLink from "../../components/marketing/EnterAppLink";
import { appPath } from "../../routes/paths";

const STEPS = [
  { icon: Target, title: "设定目标", desc: "告诉 Planner 你想达成什么，例如掌握一门课程或准备一次考试。" },
  { icon: Clock, title: "评估时间与基础", desc: "填写每周可投入时长和当前水平，作为规划约束。" },
  { icon: RouteIcon, title: "生成路线图", desc: "Agent 将目标拆解成阶段与每周任务。" },
  { icon: RefreshCw, title: "跟踪并调整", desc: "根据完成情况动态重排后续计划。" },
];

const SAMPLE_WEEK = [
  { day: "Mon", task: "复习函数与极限", hours: 1.5 },
  { day: "Tue", task: "练习题 20 道", hours: 1 },
  { day: "Wed", task: "导数概念与应用", hours: 2 },
  { day: "Thu", task: "错题整理", hours: 1 },
  { day: "Fri", task: "小测验", hours: 1 },
  { day: "Sat", task: "项目实践：数据可视化", hours: 2.5 },
  { day: "Sun", task: "本周回顾 & 下周预览", hours: 0.5 },
];

export default function Planner() {
  return (
    <>
      <PageHeader
        eyebrow="AI Study Planner"
        title={<>Plan smarter,<br />week by week</>}
        description="从目标到每日任务，Planner 帮你把大目标拆成可执行的小步骤，并随进度自动调整。"
      >
        <EnterAppLink to={appPath("planner")}>开始规划</EnterAppLink>
      </PageHeader>

      <section className="mx-auto mt-6 grid w-full max-w-[1400px] gap-6 lg:grid-cols-5">
        <div className="rounded-[32px] border border-slate-200/50 bg-white p-8 lg:col-span-2">
          <h2 className="font-display text-[22px] font-semibold tracking-tight text-[#0a1b33]">How it works</h2>
          <ol className="mt-6 space-y-6">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a152d] text-white"><s.icon className="h-4 w-4" /></div>
                  {i < STEPS.length - 1 && <div className="mt-2 w-px flex-1 bg-slate-200" />}
                </div>
                <div className="pb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Step {i + 1}</p>
                  <h3 className="text-[15px] font-semibold text-[#0a1b33]">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#64748b]">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="rounded-[32px] border border-slate-200/50 bg-white p-8 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-semibold tracking-tight text-[#0a1b33]">Weekly preview</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">示例数据</span>
          </div>
          <p className="mt-1 text-[13px] text-[#64748b]">以下为演示用示例周计划，非真实用户数据。</p>
          <ul className="mt-6 divide-y divide-slate-100">
            {SAMPLE_WEEK.map((d) => (
              <li key={d.day} className="flex items-center gap-4 py-3">
                <span className="w-12 rounded-full bg-[#f9fafb] py-1 text-center text-[12px] font-semibold text-[#0a1b33]">{d.day}</span>
                <span className="flex-1 text-[14px] text-[#0a1b33]">{d.task}</span>
                <span className="text-[12px] text-[#64748b]">{d.hours}h</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end">
            <EnterAppLink to={appPath("planner")} variant="secondary">在平台中生成我的计划</EnterAppLink>
          </div>
        </div>
      </section>
    </>
  );
}
