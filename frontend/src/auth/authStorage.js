const AUTH_TOKEN_KEY = "student_auth_token";
const AUTH_USER_KEY = "student_auth_user";
const PROFILE_NAME_KEY = "student_profile_name";

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthToken() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  if (token.startsWith("demo_")) {
    clearAuth();
    return null;
  }
  return token;
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function getStoredUser() {
  if (!getAuthToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function persistAuthSession({ access_token, user }) {
  if (!access_token || !user) return null;
  const displayName = user.nickname?.trim() || user.username || "学习探索者";
  localStorage.setItem(AUTH_TOKEN_KEY, access_token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(PROFILE_NAME_KEY, displayName);
  return user;
}
