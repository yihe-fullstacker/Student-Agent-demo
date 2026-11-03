const AUTH_TOKEN_KEY = "student_auth_token";
const AUTH_USER_KEY = "student_auth_user";
const PROFILE_NAME_KEY = "student_profile_name";

export function isAuthenticated() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function persistAuth({ email, name, remember }) {
  const displayName = name?.trim() || email.split("@")[0] || "学习探索者";
  const user = {
    email: email.trim(),
    name: displayName,
    remembered: Boolean(remember),
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(
    AUTH_TOKEN_KEY,
    `demo_${btoa(unescape(encodeURIComponent(email.trim()))).slice(0, 24)}`
  );
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(PROFILE_NAME_KEY, displayName);
  return user;
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
