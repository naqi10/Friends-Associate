/** Small shared helpers for the Sales desk and Customers screens. */

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Colour of a lead stage chip. */
export const STAGE_CHIP: Record<string, string> = {
  new: "bg-teal-50 text-teal-800",
  contacted: "bg-sky-50 text-sky-800",
  requirement_received: "bg-indigo-50 text-indigo-800",
  quotation_pending: "bg-amber-50 text-amber-800",
  quotation_sent: "bg-violet-50 text-violet-800",
  follow_up: "bg-amber-50 text-amber-800",
  converted: "bg-emerald-50 text-emerald-800",
  closed: "bg-mist text-muted",
};

/** "7 Oct" (same year) or "7 Oct 2025". */
export function shortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(`${d}T12:00:00Z`) : d;
  const thisYear = new Date().getUTCFullYear() === date.getUTCFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(thisYear ? {} : { year: "numeric" }), timeZone: "Asia/Karachi" });
}

/** "today", "3d ago", "5w ago". */
export function ago(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 21) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
