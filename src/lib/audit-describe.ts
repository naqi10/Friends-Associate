/**
 * Turns raw audit rows (action + module + JSON before/after) into what the Audit log page shows:
 * a plain sentence, an area chip, an icon kind, a link to the record and a field-by-field diff.
 */
import { INVESTMENT_STATUSES, LEAD_STATUSES, labelOf } from "./catalog";

export type AuditKind = "add" | "edit" | "delete" | "done" | "export" | "security";

export const AREAS: Record<string, { label: string; chip: string }> = {
  leads: { label: "Leads", chip: "bg-teal-50 text-teal-800" },
  payments: { label: "Payments", chip: "bg-emerald-50 text-emerald-800" },
  bookings: { label: "Bookings", chip: "bg-sky-50 text-sky-800" },
  customers: { label: "Customers", chip: "bg-cyan-50 text-cyan-800" },
  users: { label: "Customers", chip: "bg-cyan-50 text-cyan-800" },
  staff: { label: "Staff", chip: "bg-violet-50 text-violet-800" },
  permissions: { label: "Permissions", chip: "bg-violet-50 text-violet-800" },
  content: { label: "Website content", chip: "bg-amber-50 text-amber-800" },
  services: { label: "Services", chip: "bg-amber-50 text-amber-800" },
  projects: { label: "Projects", chip: "bg-mist text-ink" },
  properties: { label: "Properties", chip: "bg-mist text-ink" },
  investments: { label: "Investments", chip: "bg-mist text-ink" },
  progress: { label: "Progress", chip: "bg-orange-50 text-orange-800" },
  documents: { label: "Documents", chip: "bg-stone-100 text-stone-700" },
  audit: { label: "Audit log", chip: "bg-mist text-ink" },
};
/** Order of the area filter pills. */
export const AREA_ORDER = ["leads", "payments", "bookings", "customers", "staff", "content", "projects", "properties", "investments", "progress", "documents", "services", "permissions"];

const NOUN: Record<string, string> = {
  leads: "a lead",
  payments: "a payment",
  bookings: "a booking",
  customers: "a customer",
  users: "a customer",
  staff: "a staff member",
  permissions: "role permissions",
  content: "website content",
  services: "a service",
  projects: "a project",
  properties: "a property",
  investments: "an investment",
  progress: "project progress",
  documents: "a document",
  audit: "the audit log",
};

export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;
export function parse(v: string | null): Json {
  if (!v) return null;
  try {
    return JSON.parse(v) as Json;
  } catch {
    return v;
  }
}
const obj = (v: Json): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Sentence parts: plain text and bold text, so the page can render "**Sheraz** moved a lead to **Contacted**". */
export type Part = { text: string; bold?: boolean };

export function describe(e: { action: string; module: string; recordId: string | null; oldValue: string | null; newValue: string | null }): {
  parts: Part[];
  kind: AuditKind;
} {
  const before = obj(parse(e.oldValue));
  const after = obj(parse(e.newValue));
  const noun = NOUN[e.module] ?? e.module;
  const b = (text: string): Part => ({ text, bold: true });
  const t = (text: string): Part => ({ text });
  const [action, arg] = e.action.split(":");

  // Specific, friendlier sentences first.
  if (e.module === "leads" && action === "update" && after.status && before.status !== after.status)
    return { parts: [t("moved a lead to "), b(labelOf(LEAD_STATUSES, String(after.status)) || String(after.status))], kind: "edit" };
  if (e.module === "leads" && action === "convert") return { parts: [t("converted "), b("a lead"), t(" into a customer")], kind: "done" };
  if (e.module === "leads" && (action === "assign" || action === "bulk-assign" || action === "assign-all"))
    return { parts: [t("assigned "), b(action === "assign" ? "a lead" : "leads")], kind: "edit" };
  if (e.module === "payments" && action === "record-payment") return { parts: [t("recorded "), b("a payment")], kind: "done" };
  if (e.module === "payments" && action === "reverse-payment") return { parts: [t("reversed "), b("a payment")], kind: "delete" };
  if (e.module === "bookings" && action === "reminder") return { parts: [t("sent "), b("a payment reminder")], kind: "done" };
  if (e.module === "bookings" && action === "cancel") return { parts: [t("cancelled "), b("a booking")], kind: "delete" };
  if (e.module === "content" && e.recordId === "home.hero") return { parts: [t("edited "), b("the home page hero")], kind: "edit" };
  if (e.module === "content" && e.recordId?.startsWith("page.")) return { parts: [t("edited "), b("a page heading")], kind: "edit" };
  if (e.module === "permissions") return { parts: [t(action === "reset-defaults" ? "reset " : "changed "), b("role permissions")], kind: "security" };
  if (action === "change-own-password") return { parts: [t("changed "), b("their own password")], kind: "security" };
  if (action === "reset-password") return { parts: [t("reset "), b(`${noun === "a staff member" ? "a staff member's" : "a customer's"} password`)], kind: "security" };
  if (action === "change-role") return { parts: [t("changed "), b("a staff member's role"), ...(after.role ? [t(" to "), b(String(after.role).replace("_", " "))] : [])], kind: "edit" };
  if (action === "status") {
    const label = e.module === "investments" ? labelOf(INVESTMENT_STATUSES, arg) : arg;
    return { parts: [t("marked "), b(noun), t(" as "), b(label || arg)], kind: "edit" };
  }
  if (action === "featured" || action === "published") {
    const on = arg === "on";
    return { parts: [t(action === "featured" ? (on ? "featured " : "un-featured ") : on ? "published " : "hid "), b(noun), t(action === "featured" ? " on the home page" : on ? " on the website" : " from the website")], kind: "edit" };
  }
  if (action === "publish" || action === "unpublish")
    return { parts: [t(e.module === "progress" ? "published " : action === "publish" ? "published " : "hid "), b(e.module === "progress" ? "a progress update" : noun)], kind: e.module === "progress" ? "done" : "edit" };
  if (action === "save-draft") return { parts: [t("saved "), b("a progress draft")], kind: "edit" };
  if (action === "export") return { parts: [t("exported "), b(`${AREAS[e.module]?.label.toLowerCase() ?? e.module}`), t(" to CSV")], kind: "export" };
  if (action === "import") return { parts: [t("imported "), b("properties"), t(" from CSV")], kind: "add" };
  if (action === "upload") return { parts: [t("uploaded "), b("a document")], kind: "add" };
  if (action === "new-version") return { parts: [t("uploaded "), b("a new document version")], kind: "edit" };
  if (action === "attach-file") return { parts: [t("attached "), b("a file"), t(" to a document")], kind: "add" };
  if (action === "duplicate") return { parts: [t("duplicated "), b(noun)], kind: "add" };
  if (action === "archive") return { parts: [t("archived "), b(noun)], kind: "delete" };
  if (action === "restore") return { parts: [t("restored "), b(noun)], kind: "done" };
  if (action === "activate" || action === "enable") return { parts: [t("switched on "), b(`${noun === "a staff member" ? "a staff" : "a customer"} account`)], kind: "done" };
  if (action === "deactivate" || action === "disable") return { parts: [t("switched off "), b(`${noun === "a staff member" ? "a staff" : "a customer"} account`)], kind: "delete" };
  if (action === "unlock-downloads" || action === "lock-downloads") return { parts: [t(action === "unlock-downloads" ? "unlocked " : "locked "), b("document downloads"), t(" for a customer")], kind: "edit" };
  if (action === "add-stage") return { parts: [t("added "), b("a construction stage")], kind: "add" };
  if (action === "delete-stage") return { parts: [t("removed "), b("a construction stage")], kind: "delete" };
  if (action === "update-stage" || action === "update-progress") return { parts: [t("updated "), b("construction progress")], kind: "edit" };
  if (action.startsWith("bulk-")) return { parts: [t("changed "), b(`several ${AREAS[e.module]?.label.toLowerCase() ?? "records"}`), t(" at once")], kind: action === "bulk-archive" ? "delete" : "edit" };
  if (action === "create") return { parts: [t("added "), b(noun)], kind: "add" };
  if (action === "delete") return { parts: [t(e.module === "staff" ? "removed " : "deleted "), b(noun)], kind: "delete" };
  if (action === "update") return { parts: [t("edited "), b(noun)], kind: "edit" };
  return { parts: [t(`${e.action.replace(/[-:]/g, " ")} `), b(noun)], kind: "edit" };
}

/** Admin page that shows the record, when it still makes sense to open it. */
export function recordLink(e: { action: string; module: string; recordId: string | null; oldValue: string | null }): string | null {
  const id = e.recordId;
  const before = obj(parse(e.oldValue));
  switch (e.module) {
    case "leads":
      return id && e.action !== "delete" ? `/sales?lead=${id}` : "/sales";
    case "payments":
      return before.bookingId ? `/admin/bookings/${before.bookingId}` : "/admin/bookings";
    case "bookings":
      return id ? `/admin/bookings/${id}` : "/admin/bookings";
    case "customers":
    case "users":
      return id && e.action !== "delete" ? `/admin/customers/${id}` : "/admin/customers";
    case "staff":
      return id && e.action !== "delete" ? `/admin/staff/${id}` : "/admin/staff";
    case "permissions":
      return "/admin/permissions";
    case "content":
      return id?.startsWith("page.") ? "/admin/content/pages" : "/admin/content";
    case "services":
      return id && e.action !== "delete" ? `/admin/services/${id}` : "/admin/services";
    case "projects":
      return id && e.action !== "delete" ? `/admin/projects/${id}` : "/admin/projects";
    case "properties":
      return id && e.action !== "delete" ? `/admin/properties/${id}` : "/admin/properties";
    case "investments":
      return id && e.action !== "delete" ? `/admin/investments/${id}` : "/admin/investments";
    case "progress":
      return id ? `/pm?p=${id}` : "/pm";
    case "documents":
      return id && e.action !== "delete" ? `/admin/documents?versions=${id}` : "/admin/documents";
    default:
      return null;
  }
}

const HIDDEN = new Set(["id", "createdAt", "updatedAt", "created_at", "updated_at"]);
const label = (k: string) => {
  const s = k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\bpkr\b/i, "(PKR)").replace(/\bid\b/i, "ID");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace("(pkr)", "(PKR)").replace(" id", " ID");
};
export function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString("en-PK");
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    return v.length > 140 ? `${v.slice(0, 140)}…` : v;
  }
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.every((x) => typeof x !== "object") ? v.join(", ") : `${v.length} item${v.length === 1 ? "" : "s"}`;
  const s = JSON.stringify(v);
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

/**
 * Field-by-field changes. With both a before and an after it lists only what changed, plus which known fields
 * stayed the same; with only one side it lists those values.
 */
export function diff(oldValue: string | null, newValue: string | null): { rows: { field: string; before: string | null; after: string | null }[]; unchanged: string[] } {
  const a = parse(oldValue);
  const b = parse(newValue);
  if (a !== null && typeof a !== "object") return { rows: [{ field: "Value", before: show(a), after: b === null ? null : show(b) }], unchanged: [] };
  const before = obj(a);
  const after = obj(b);
  const hasBefore = oldValue !== null;
  const hasAfter = newValue !== null;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => !HIDDEN.has(k));
  const rows: { field: string; before: string | null; after: string | null }[] = [];
  const unchanged: string[] = [];
  for (const k of keys) {
    const x = JSON.stringify(before[k] ?? null);
    const y = JSON.stringify(after[k] ?? null);
    if (hasBefore && hasAfter && x === y) {
      unchanged.push(label(k));
      continue;
    }
    rows.push({ field: label(k), before: hasBefore ? show(before[k]) : null, after: hasAfter ? show(after[k]) : null });
  }
  if (Array.isArray(b) && rows.length === 0) rows.push({ field: "Details", before: null, after: show(b) });
  return { rows, unchanged };
}
