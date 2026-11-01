import { motion } from "motion/react";
import { Calendar, GraduationCap, Briefcase, FolderGit2 } from "lucide-react";
import PageHeader from "../../components/marketing/PageHeader";
import EnterAppLink from "../../components/marketing/EnterAppLink";
import { appPath } from "../../routes/paths";

const AGENTS = [
  {
    id: "planner", name: "AI Study Planner", icon: Calendar,
    desc: "把目标拆解为按周推进的学习路线，并随进度动态调整。",
    input: "学习目标、可用时间、当前基础", output: "分阶段路线图与每周任务清单",
  },
  {
    id: "examprep", name: "Exam Prep Agent", icon: GraduationCap,
    desc: "围绕指定科目生成模拟题与讲解，定位薄弱知识点。",
    input: "科目 / 考试范围、难度", output: "模拟试题、答案解析、薄弱点建议",
  },
  {
    id: "career", name: "Career Guidance Agent", icon: Briefcase,
    desc: "对比目标岗位要求与现有技能，给出技能差距分析。",
    input: "目标岗位、已有技能与经历", output: "技能差距报告与提升建议",
  },
  {
    id: "projects", name: "Project Recommendations", icon: FolderGit2,
    desc: "推荐可写进作品集的实战项目，附技术栈与里程碑。",
    input: "兴趣方向、技术栈、时间预算", output: "项目方案、里程碑与参考技术栈",
  },
];

export default function Agents() {
  return (
    <>
      <PageHeader
        eyebrow="Success Agents"
        title={<>Four agents,<br />one learning cockpit</>}
        description="每个 Agent 专注一个环节：规划、备考、职业与作品集。它们共享你的学习档案，在平台内协同工作。"
      />
      <section className="mx-auto mt-6 grid w-full max-w-[1400px] gap-6 md:grid-cols-2">
        {AGENTS.map((a, i) => (
          <motion.article
            key={a.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="flex flex-col rounded-[32px] border border-slate-200/50 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.05)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0a152d] text-white">
              <a.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-display text-[22px] font-semibold tracking-tight text-[#0a1b33]">{a.name}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#64748b]">{a.desc}</p>
            <dl className="mt-5 grid gap-3 text-[13px] sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f9fafb] p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Input</dt>
                <dd className="mt-1 text-[#0a1b33]">{a.input}</dd>
              </div>
              <div className="rounded-2xl bg-[#f9fafb] p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Output</dt>
                <dd className="mt-1 text-[#0a1b33]">{a.output}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <EnterAppLink to={appPath(a.id)}>进入平台</EnterAppLink>
            </div>
          </motion.article>
        ))}
      </section>
    </>
  );
}
