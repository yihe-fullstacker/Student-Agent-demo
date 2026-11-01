import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthModal from "../components/AuthModal";
import FloatingNav from "../components/marketing/FloatingNav";
import AuthButtons from "../components/marketing/AuthButtons";
import { PATHS } from "../routes/paths";

/** Public site layout: brand, auth entry, floating nav, global AuthModal. */
export default function MarketingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modal, openAuth, closeAuth } = useAuth();
  const isHome = location.pathname === PATHS.HOME;

  // Opened by ProtectedRoute redirect: { openAuth, from }
  useEffect(() => {
    const st = location.state;
    if (st?.openAuth) {
      openAuth(st.openAuth === "register" ? "register" : "login", st.from || PATHS.APP);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, openAuth]);

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4 md:p-8">
      {!isHome && (
        <header className="mx-auto mb-6 flex w-full max-w-[1400px] items-center justify-between">
          <Link to={PATHS.HOME} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-[14px] text-[#0a1b33] shadow-sm">✦</span>
            <span className="font-display text-[16px] font-semibold tracking-tight text-[#0a1b33]">Student Success</span>
          </Link>
          <AuthButtons size="sm" />
        </header>
      )}

      <Outlet />

      {!isHome && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
          <div className="pointer-events-auto">
            <FloatingNav />
          </div>
        </div>
      )}
      {!isHome && <div className="h-24" aria-hidden />}

      <AuthModal open={modal.open} onClose={closeAuth} initialMode={modal.mode} redirectTo={modal.redirectTo} />
    </div>
  );
}
