import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../../auth/AuthContext";
import { PATHS } from "../../routes/paths";

/** Login / Register buttons; becomes "进入平台" once authenticated. */
export default function AuthButtons({ size = "lg" }) {
  const { isAuthenticated, openAuth } = useAuth();
  const navigate = useNavigate();
  const pad = size === "lg" ? "px-7 py-3 text-[13px]" : "px-5 py-2 text-[12px]";
  const spring = { type: "spring", stiffness: 300, damping: 20 };
  const primary = `bg-[#0a152d] text-white font-semibold rounded-full shadow-[0_12px_30px_rgba(10,21,45,0.25)] cursor-pointer ${pad}`;
  const secondary = `bg-white text-[#0a1b33] font-semibold rounded-full border border-slate-200/70 shadow-sm hover:border-slate-300 cursor-pointer ${pad}`;

  if (isAuthenticated) {
    return (
      <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring}
        onClick={() => navigate(PATHS.APP)} className={primary}>
        进入平台 →
      </motion.button>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring}
        onClick={() => openAuth("login")} className={primary}>
        登录
      </motion.button>
      <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring}
        onClick={() => openAuth("register")} className={secondary}>
        注册
      </motion.button>
    </div>
  );
}
