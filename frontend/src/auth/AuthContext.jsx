/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { clearAuth, getStoredUser, isAuthenticated, persistAuth } from "./authStorage";
import { PATHS } from "../routes/paths";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (isAuthenticated() ? getStoredUser() : null));
  // Global auth modal state: { open, mode: "login"|"register", redirectTo }
  const [modal, setModal] = useState({ open: false, mode: "login", redirectTo: PATHS.APP });

  const login = useCallback((payload) => {
    const u = persistAuth(payload);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const openAuth = useCallback((mode = "login", redirectTo = PATHS.APP) => {
    setModal({ open: true, mode, redirectTo });
  }, []);

  const closeAuth = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout, modal, openAuth, closeAuth }),
    [user, login, logout, modal, openAuth, closeAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
