import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

/** Goes to an /app route; when logged out, opens login and redirects there afterwards. */
export default function EnterAppLink({ to, children = "进入平台", variant = "primary" }) {
  const { isAuthenticated, openAuth } = useAuth();
  const navigate = useNavigate();
  const cls =
    variant === "primary"
      ? "bg-[#0a152d] text-white shadow-[0_12px_30px_rgba(10,21,45,0.25)] hover:bg-[#1a2a4d]"
      : "bg-white text-[#0a1b33] border border-slate-200/70 shadow-sm hover:border-slate-300";
  return (
    <button
      type="button"
      onClick={() => (isAuthenticated ? navigate(to) : openAuth("login", to))}
      className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[12px] font-semibold transition ${cls}`}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
