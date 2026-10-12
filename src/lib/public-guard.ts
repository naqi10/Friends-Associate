import { countRecentFailures, recordLoginAttempt } from "@/lib/data";

const FORM_WINDOW_MS = 10 * 60 * 1000;
const MAX_FORMS_PER_WINDOW = 5;

/** Client IP as reported by the hosting proxy (Vercel/Nginx set x-forwarded-for). */
export function clientIp(h: Headers): string {
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Per-IP limit shared by every public form and the chatbot: 5 submissions per 10 minutes.
 * Returns false when the limit is reached; otherwise counts this submission and returns true.
 */
export async function allowPublicSubmission(ip: string): Promise<boolean> {
  const key = `form:${ip}`;
  if ((await countRecentFailures(key, new Date(Date.now() - FORM_WINDOW_MS))) >= MAX_FORMS_PER_WINDOW) return false;
  await recordLoginAttempt([key], false);
  return true;
}

/**
 * JSON API routes are not covered by Next's server-action origin check, so they verify it themselves:
 * a browser request from another site carries a different Origin and is refused.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
