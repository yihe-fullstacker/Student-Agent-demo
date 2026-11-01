import { motion } from "motion/react";

export default function PageHeader({ eyebrow, title, description, children }) {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[48px] border border-slate-200/50 bg-white px-8 py-14 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] md:px-16 md:py-20">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-200/20 blur-3xl" />
      <motion.div className="relative" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
        {eyebrow && (
          <span className="inline-flex rounded-full border border-slate-200/70 bg-[#f9fafb] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">{eyebrow}</span>
        )}
        <h1 className="mt-5 font-display text-[36px] font-medium leading-[1.1] tracking-tight text-[#0a1b33] md:text-[52px]">{title}</h1>
        {description && <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-[#64748b] md:text-[15px]">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </motion.div>
    </section>
  );
}
