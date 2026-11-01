import { PATHS } from "../routes/paths";

/** Shared marketing navigation — used by Hero floating nav and MarketingLayout. */
export const MARKETING_NAV = [
  { key: "agents", label: "Agents", to: PATHS.AGENTS },
  { key: "planner", label: "Planner", to: PATHS.PLANNER },
];

export const MARKETING_CTA = { key: "contact", label: "Get in touch", to: PATHS.CONTACT };
