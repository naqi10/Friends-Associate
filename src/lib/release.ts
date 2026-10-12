/**
 * Release switches. One codebase ships everything; production turns off parts that are not live yet:
 *
 *   DISABLED_FEATURES="sales,pm,chatbot"
 *
 *   sales    sales-staff logins (admins keep the Sales desk / leads list)
 *   pm       project-manager logins (admins keep the PM desk)
 *   chatbot  the floating assistant and its /api/chat endpoints
 *
 * Unset locally, so development always has every feature. Unknown names are ignored.
 */
import type { UserRole } from "./types";

export const FEATURES = ["sales", "pm", "chatbot"] as const;
export type Feature = (typeof FEATURES)[number];

const disabled = new Set(
  (process.env.DISABLED_FEATURES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Feature => (FEATURES as readonly string[]).includes(s)),
);

export function isEnabled(feature: Feature): boolean {
  return !disabled.has(feature);
}

/** Staff roles whose logins are switched off. Admin and buyer are never switched off. */
const ROLE_FEATURE: Partial<Record<UserRole, Feature>> = { sales: "sales", project_manager: "pm" };

export function isRoleEnabled(role: UserRole | string): boolean {
  const feature = ROLE_FEATURE[role as UserRole];
  return !feature || isEnabled(feature);
}
