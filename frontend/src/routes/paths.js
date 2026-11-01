/** Centralised route path constants — never hard-code paths elsewhere. */
export const PATHS = Object.freeze({
  HOME: "/",
  AGENTS: "/agents",
  PLANNER: "/planner",
  CONTACT: "/contact",
  APP: "/app",
  APP_SECTION: "/app/:section",
});

/** App (authenticated) sub-sections, mapped to AppShell page ids. */
export const APP_SECTIONS = Object.freeze({
  home: "",
  dashboard: "dashboard",
  planner: "planner",
  examprep: "exam-prep",
  career: "career",
  projects: "projects",
  settings: "settings",
});

export const appPath = (id = "home") => {
  const seg = APP_SECTIONS[id];
  return seg ? `${PATHS.APP}/${seg}` : PATHS.APP;
};

export const sectionIdFromSegment = (segment) =>
  Object.keys(APP_SECTIONS).find((k) => APP_SECTIONS[k] === (segment || "")) ?? null;
