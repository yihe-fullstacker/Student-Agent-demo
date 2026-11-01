import { Link, NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { MARKETING_CTA, MARKETING_NAV } from "../../config/navigation";
import { PATHS } from "../../routes/paths";

/** Pill floating navbar shared by the Hero and every marketing page. */
export default function FloatingNav({ className = "" }) {
  const item = ({ isActive }) =>
    `px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
      isActive ? "bg-slate-100 text-[#0a1b33]" : "text-slate-500 hover:text-[#0a1b33]"
    }`;
  return (
    <motion.nav
      aria-label="Primary"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      className={`flex items-center bg-white/90 backdrop-blur-2xl px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/40 ${className}`}
    >
      <Link
        to={PATHS.HOME}
        aria-label="Home"
        className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[#0a1b33] text-[14px] mr-1"
      >
        ✦
      </Link>
      {MARKETING_NAV.map((n) => (
        <NavLink key={n.key} to={n.to} className={item}>
          {n.label}
        </NavLink>
      ))}
      <NavLink
        to={MARKETING_CTA.to}
        className={({ isActive }) =>
          `flex items-center gap-1 ml-1 px-5 py-2 rounded-full text-[12px] font-semibold border shadow-sm transition-all ${
            isActive
              ? "bg-[#0a152d] text-white border-[#0a152d]"
              : "bg-white text-[#0a1b33] border-slate-200/60 hover:border-slate-300"
          }`
        }
      >
        {MARKETING_CTA.label}
        <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
      </NavLink>
    </motion.nav>
  );
}
