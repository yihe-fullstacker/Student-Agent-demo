/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuth,
  getAuthToken,
  getStoredUser,
  persistAuthSession,
} from "./authStorage";
import { PATHS } from "../routes/paths";
import { apiService } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [authLoading, setAuthLoading] = useState(() => Boolean(getAuthToken()));
  // Global auth modal state: { open, mode: "login"|"register", redirectTo }
  const [modal, setModal] = useState({ open: false, mode: "login", redirectTo: PATHS.APP });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      return undefined;
    }

    let cancelled = false;
    apiService
      .getCurrentUser()
      .then((freshUser) => {
        if (cancelled) return;
        persistAuthSession({ access_token: token, user: freshUser });
        setUser(freshUser);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 401) {
          clearAuth();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
      setUser(null);
      setModal({ open: true, mode: "login", redirectTo: PATHS.APP });
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async ({ account, password, remember = true }) => {
    const data = await apiService.login({ account, password, remember });
    persistAuthSession(data);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async ({ email, password, nickname, username }) => {
    const data = await apiService.register({ email, password, nickname, username });
    persistAuthSession(data);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) {
        await apiService.logout();
      }
    } catch {
      // Ignore network errors during logout so local session always clears
    } finally {
      clearAuth();
      setUser(null);
    }
  }, []);

  const openAuth = useCallback((mode = "login", redirectTo = PATHS.APP) => {
    setModal({ open: true, mode, redirectTo });
  }, []);

  const closeAuth = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      modal,
      openAuth,
      closeAuth,
    }),
    [user, authLoading, login, register, logout, modal, openAuth, closeAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
