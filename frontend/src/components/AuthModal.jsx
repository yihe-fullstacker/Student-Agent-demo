import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, X, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { PATHS } from "../routes/paths";

function AgentStage() {
  const nodes = [
    { x: 28, y: 32, delay: 0 },
    { x: 72, y: 24, delay: 0.35 },
    { x: 50, y: 58, delay: 0.7 },
    { x: 22, y: 72, delay: 1.05 },
    { x: 78, y: 68, delay: 1.4 },
  ];

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0a152d] via-[#12233f] to-[#1a3358] p-6 text-white">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-sky-400/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-400/25 blur-3xl" />
      </div>

      <div className="relative z-10 mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          AI Agent Network
        </div>
        <h3 className="font-display text-[22px] font-semibold leading-snug tracking-tight">
          Smart agents
          <br />
          for student success
        </h3>
        <p className="mt-2 max-w-[220px] text-[12px] leading-relaxed text-white/65">
          Study planner · Exam prep · Career guidance — connected in one glass cockpit.
        </p>
      </div>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.line
          x1="28" y1="32" x2="72" y2="24"
          stroke="rgba(147,197,253,0.45)" strokeWidth="0.35"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />
        <motion.line
          x1="72" y1="24" x2="50" y2="58"
          stroke="rgba(147,197,253,0.4)" strokeWidth="0.35"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.45 }}
        />
        <motion.line
          x1="50" y1="58" x2="22" y2="72"
          stroke="rgba(147,197,253,0.35)" strokeWidth="0.35"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
        />
        <motion.line
          x1="50" y1="58" x2="78" y2="68"
          stroke="rgba(147,197,253,0.35)" strokeWidth="0.35"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.85 }}
        />
      </svg>

      {nodes.map((n, i) => (
        <motion.div
          key={i}
          className="absolute z-10"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: n.delay, type: "spring", stiffness: 220, damping: 16 }}
        >
          <motion.div
            className="h-3.5 w-3.5 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.9)]"
            animate={{ scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: n.delay }}
          />
          <motion.div
            className="absolute inset-0 -m-2 rounded-full border border-sky-200/40"
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: n.delay }}
          />
        </motion.div>
      ))}

      <div className="absolute bottom-5 left-5 right-5 z-10 grid grid-cols-3 gap-2">
        {["Planner", "Exam", "Career"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/10 px-2 py-2 text-center text-[10px] font-medium backdrop-blur"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthModal({ open, onClose, initialMode = "login", redirectTo = PATHS.APP }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [method, setMethod] = useState("password"); // password | sms | oauth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [prevKey, setPrevKey] = useState(null);
  const key = open ? initialMode : null;
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setMode(initialMode);
      setError("");
      setMethod("password");
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);


  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (method !== "password") {
      setError(method === "sms" ? "短信登录为演示占位，请使用密码登录。" : "第三方授权为演示占位，请使用密码登录。");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("请填写邮箱和密码。");
      return;
    }
    if (mode === "register" && password.trim().length < 6) {
      setError("注册密码至少 6 位。");
      return;
    }

    setSubmitting(true);
    try {
      login({ email, name, remember });
      onClose?.();
      navigate(redirectTo || PATHS.APP, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close backdrop"
            className="absolute inset-0 bg-[#0a152d]/45 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative z-10 grid w-full max-w-[880px] overflow-hidden rounded-[32px] border border-slate-200/70 bg-[#f9fafb] shadow-[0_40px_100px_-20px_rgba(10,21,45,0.35)] md:grid-cols-2"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className="hidden p-4 md:block md:pr-0">
              <AgentStage />
            </div>

            <div className="relative flex flex-col p-6 md:p-8">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-[#0a152d]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <h2
                id="auth-modal-title"
                className="font-display text-[22px] font-semibold tracking-tight text-[#0a152d] md:text-[24px]"
              >
                {mode === "login" ? "登录后继续学习之旅" : "注册开启智能学习平台"}
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                海军蓝玻璃质感 · 与 Student Success Agent 同一视觉语言
              </p>

              <div className="mt-5 flex rounded-full bg-slate-200/70 p-1">
                {[
                  { id: "login", label: "登录" },
                  { id: "register", label: "注册" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setMode(tab.id);
                      setError("");
                      setMethod("password");
                    }}
                    className={`flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      mode === tab.id
                        ? "bg-white text-[#0a152d] shadow-sm"
                        : "text-slate-500 hover:text-[#0a152d]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex rounded-full bg-slate-100 p-1">
                {[
                  { id: "password", label: "密码" },
                  { id: "sms", label: "短信" },
                  { id: "oauth", label: "授权" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setMethod(tab.id);
                      setError("");
                    }}
                    className={`flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      method === tab.id
                        ? "bg-white text-[#0a152d] shadow-sm"
                        : "text-slate-500 hover:text-[#0a152d]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col">
                {method === "password" ? (
                  <>
                    {mode === "register" && (
                      <label className="mb-3 block">
                        <span className="mb-1.5 block text-[12px] font-medium text-slate-500">昵称</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Success Explorer"
                          className="w-full rounded-2xl border border-transparent bg-slate-100/90 px-4 py-3 text-[14px] text-[#0a152d] outline-none transition focus:border-[#0a152d]/20 focus:bg-white focus:ring-2 focus:ring-[#0a152d]/10"
                        />
                      </label>
                    )}

                    <label className="mb-3 block">
                      <span className="mb-1.5 block text-[12px] font-medium text-slate-500">工作邮箱</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu / 用户名"
                        className="w-full rounded-2xl border border-transparent bg-slate-100/90 px-4 py-3 text-[14px] text-[#0a152d] outline-none transition focus:border-[#0a152d]/20 focus:bg-white focus:ring-2 focus:ring-[#0a152d]/10"
                      />
                    </label>

                    <label className="mb-3 block">
                      <span className="mb-1.5 block text-[12px] font-medium text-slate-500">密码</span>
                      <div className="flex gap-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-2xl border border-transparent bg-slate-100/90 px-4 py-3 text-[14px] text-[#0a152d] outline-none transition focus:border-[#0a152d]/20 focus:bg-white focus:ring-2 focus:ring-[#0a152d]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 text-slate-500 shadow-sm transition hover:text-[#0a152d]"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>

                    <div className="mb-4 flex items-center justify-between text-[12px]">
                      <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#0a152d]"
                        />
                        记住我
                      </label>
                      <button
                        type="button"
                        className="font-medium text-sky-700 hover:underline"
                        onClick={() => alert("演示环境：请使用任意邮箱和密码登录。")}
                      >
                        忘记密码?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-[13px] text-slate-500">
                    {method === "sms"
                      ? "短信验证码登录即将开放，当前为 UI 占位。"
                      : "Google / GitHub 授权入口即将开放，当前为 UI 占位。"}
                  </div>
                )}

                {error ? (
                  <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-600">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-auto w-full rounded-full bg-[#0a152d] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_12px_30px_rgba(10,21,45,0.28)] transition hover:bg-[#1a2a4d] disabled:opacity-60"
                >
                  {submitting ? "进入中…" : "进入平台 →"}
                </button>

                <div className="mt-5 flex items-center gap-3 text-[11px] text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  授权入口
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("oauth")}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm hover:border-slate-300"
                  >
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("oauth")}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm hover:border-slate-300"
                  >
                    GitHub
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
