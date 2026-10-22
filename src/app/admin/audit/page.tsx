import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { AREAS, AREA_ORDER, describe, diff, recordLink, type AuditKind } from "@/lib/audit-describe";
import { getAuditFeed, getAuditFilters, getAuditTodayStats } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Audit log" };

type Props = { searchParams: Promise<{ who?: string; area?: string; before?: string }> };

const PAGE = 100;
const TZ = "Asia/Karachi";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const time = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const longDate = (d: Date) =>
  `${d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long" })}, ${d.toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "long" })}`;
const shortDate = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const AVATAR: Record<string, string> = {
  admin: "bg-ink text-paper",
  sales: "bg-teal-50 text-teal-800",
  project_manager: "bg-violet-50 text-violet-800",
  buyer: "bg-cyan-50 text-cyan-800",
};
const BADGE: Record<AuditKind, { bg: string; path: string }> = {
  edit: { bg: "bg-blue-600", path: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" },
  add: { bg: "bg-emerald-700", path: "M12 5v14M5 12h14" },
  delete: { bg: "bg-red-600", path: "M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" },
  done: { bg: "bg-teal-700", path: "m5 12.5 4.5 4.5L19 7.5" },
  export: { bg: "bg-stone-500", path: "M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" },
  security: { bg: "bg-violet-600", path: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" },
};

function Badge({ kind }: { kind: AuditKind }) {
  const b = BADGE[kind];
  return (
    <span className={`absolute -right-1 -bottom-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-2 ring-white ${b.bg}`}>
      <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={b.path} />
      </svg>
    </span>
  );
}

/** Today's and yesterday's dates in Pakistan time, for the day headings. */
function todayAndYesterday() {
  const now = Date.now();
  return { today: dayKey(new Date(now)), yesterday: dayKey(new Date(now - 86_400_000)) };
}

const listOf = (xs: string[]) => {
  const lower = xs.map((x, i) => (i === 0 ? x : x.toLowerCase()));
  if (lower.length <= 1) return lower.join("");
  const shown = lower.slice(0, 3);
  const rest = lower.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : `${shown.slice(0, -1).join(", ")} and ${shown.at(-1)}`;
};

export default async function AuditLogPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const before = sp.before && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : undefined;
  const [logs, stats, filters] = await Promise.all([getAuditFeed({ who: sp.who, area: sp.area, before, take: PAGE }), getAuditTodayStats(), getAuditFilters()]);

  const { today, yesterday } = todayAndYesterday();
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ who: sp.who, area: sp.area, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/audit${s ? `?${s}` : ""}`;
  };
  const exportHref = `/api/export/audit${(() => {
    const p = new URLSearchParams();
    if (sp.who) p.set("who", sp.who);
    if (sp.area) p.set("area", sp.area);
    const s = p.toString();
    return s ? `?${s}` : "";
  })()}`;
  const areas = AREA_ORDER.filter((a) => filters.areas.includes(a)).concat(filters.areas.filter((a) => !AREA_ORDER.includes(a)));

  // "Added earlier today at 11:46" / "Removed at 12:42": pair creates and deletes of the same record.
  const created = new Map<string, Date>();
  const removed = new Map<string, Date>();
  for (const l of logs) {
    if (!l.recordId) continue;
    const key = `${l.module}:${l.recordId}`;
    if (l.action === "create" && !created.has(key)) created.set(key, l.createdAt);
    if (l.action === "delete" && !removed.has(key)) removed.set(key, l.createdAt);
  }
  const note = (l: (typeof logs)[number]) => {
    if (!l.recordId) return null;
    const key = `${l.module}:${l.recordId}`;
    if (l.action === "delete" && created.has(key)) {
      const c = created.get(key)!;
      return dayKey(c) === dayKey(l.createdAt) ? `Added earlier ${dayKey(c) === today ? "today" : "that day"} at ${time(c)}` : `Added on ${shortDate(c)} at ${time(c)}`;
    }
    if (l.action === "create" && removed.has(key)) {
      const r = removed.get(key)!;
      return dayKey(r) === dayKey(l.createdAt) ? `Removed at ${time(r)}` : `Removed on ${shortDate(r)} at ${time(r)}`;
    }
    return null;
  };

  const groups: { key: string; date: Date; items: typeof logs }[] = [];
  for (const l of logs) {
    const k = dayKey(l.createdAt);
    const g = groups.at(-1);
    if (g?.key === k) g.items.push(l);
    else groups.push({ key: k, date: l.createdAt, items: [l] });
  }
  let firstDiffOpened = !!before;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Audit log</h1>
          <p className="mt-1 flex items-center gap-2 text-[15px] text-muted">
            <svg viewBox="0 0 24 24" aria-hidden className="hidden h-5 w-5 shrink-0 text-teal-800 lg:block" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
            </svg>
            <span className="lg:hidden">Who changed what, and when</span>
            <span className="hidden lg:inline">Who changed what, and when. Passwords and tokens are never recorded.</span>
          </p>
        </div>
        <a href={exportHref} className="hidden shrink-0 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-6 py-3 text-[15px] font-semibold hover:bg-mist lg:flex">
          <Icon name="download" className="h-4.5 w-4.5" /> Export CSV
        </a>
      </div>

      <dl className="mt-8 hidden grid-cols-4 gap-4 lg:grid">
        {[
          { v: stats.changes, l: "Changes today", icon: "history", tone: "bg-mist text-ink" },
          { v: stats.people, l: stats.people === 1 ? "Person made changes" : "People made changes", icon: "user", tone: "bg-mist text-ink" },
          { v: stats.deletions, l: stats.deletions === 1 ? "Deletion" : "Deletions", icon: "trash", tone: "bg-red-50 text-red-700" },
          { v: stats.payments, l: stats.payments === 1 ? "Payment recorded" : "Payments recorded", icon: "check", tone: "bg-teal-50 text-teal-800" },
        ].map((s) => (
          <div key={s.l} className="admin-card flex items-center gap-4 p-5">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${s.tone}`}>
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d={
                    s.icon === "history"
                      ? "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"
                      : s.icon === "user"
                        ? "M19 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 5 19.5V21M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
                        : s.icon === "trash"
                          ? BADGE.delete.path
                          : BADGE.done.path
                  }
                />
              </svg>
            </span>
            <div className="flex flex-col-reverse">
              <dt className="text-[15px] text-muted">{s.l}</dt>
              <dd className="text-[28px] leading-none font-semibold">{s.v}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-6 hidden flex-wrap items-center gap-3 lg:flex">
        <nav aria-label="Filter by person" className="flex gap-1 rounded-full bg-mist p-1 text-[15px]">
          {[{ id: undefined, name: "Everyone" }, ...filters.people].map((p) => (
            <Link key={p.id ?? "all"} href={link({ who: p.id, before: undefined })} className={`rounded-full px-4 py-2 ${(sp.who ?? undefined) === p.id ? "bg-white font-semibold shadow-sm" : "text-body hover:text-ink"}`}>
              {p.name}
            </Link>
          ))}
        </nav>
        <nav aria-label="Filter by area" className="flex flex-wrap gap-2 text-[15px]">
          {[undefined, ...areas].map((a) => (
            <Link
              key={a ?? "all"}
              href={link({ area: a, before: undefined })}
              className={`rounded-full border-[1.5px] px-4 py-2 ${(sp.area ?? undefined) === a ? "border-ink bg-ink font-semibold text-paper" : "border-line-strong bg-white hover:border-ink"}`}
            >
              {a ? (AREAS[a]?.label ?? a) : "All areas"}
            </Link>
          ))}
        </nav>
      </div>
      <nav aria-label="Filter by area" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 text-[15px] lg:hidden">
        {[undefined, ...areas].map((a) => (
          <Link
            key={a ?? "all"}
            href={link({ area: a, before: undefined })}
            className={`shrink-0 rounded-full border-[1.5px] px-5 py-2.5 ${(sp.area ?? undefined) === a ? "border-ink bg-ink font-semibold text-paper" : "border-line-strong bg-white"}`}
          >
            {a ? (AREAS[a]?.label ?? a) : "All"}
          </Link>
        ))}
      </nav>

      {logs.length === 0 ? (
        <p className="admin-card mt-6 px-6 py-12 text-center text-muted">No changes recorded{sp.who || sp.area ? " for this filter" : " yet"}.</p>
      ) : (
        groups.map((g) => (
          <section key={g.key} aria-label={longDate(g.date)} className="mt-6 lg:mt-8">
            <h2 className="-mx-4 border-b border-line bg-mist px-4 py-3 text-[17px] sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <strong className="font-semibold">{g.key === today ? "Today" : g.key === yesterday ? "Yesterday" : longDate(g.date)}</strong>
              <span className="text-muted">
                {g.key === today || g.key === yesterday ? <span className="hidden sm:inline"> {longDate(g.date)}</span> : null} · {g.items.length} change{g.items.length === 1 ? "" : "s"}
              </span>
            </h2>
            <ul className="-mx-4 divide-y divide-line border-b border-line bg-white sm:mx-0 sm:mt-3 sm:rounded-[24px] sm:border sm:border-line sm:shadow-[0_18px_40px_-24px_rgb(14_14_14/0.25)]">
              {g.items.map((l) => {
                const { parts, kind } = describe(l);
                const area = AREAS[l.module];
                const href = recordLink(l);
                const d = l.oldValue || l.newValue ? diff(l.oldValue, l.newValue) : null;
                const hasDiff = !!d && d.rows.length > 0;
                // Open the newest real change by default (exports and reminders only carry technical details).
                const open = hasDiff && kind !== "export" && !firstDiffOpened;
                if (open) firstDiffOpened = true;
                const n = note(l);
                const who = l.user?.name ?? "Deleted user";
                return (
                  <li key={l.id} className="relative flex gap-4 px-4 py-4 sm:px-7 sm:py-5">
                    <time dateTime={l.createdAt.toISOString()} className="hidden w-14 shrink-0 pt-1 font-mono text-[15px] text-muted md:block">
                      {time(l.createdAt)}
                    </time>
                    <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${l.user ? (AVATAR[l.user.role] ?? "bg-mist text-ink") : "bg-mist text-muted"}`}>
                      {l.user ? initials(l.user.name) : "?"}
                      <Badge kind={kind} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[16px] leading-snug ${hasDiff ? "md:pr-44" : "md:pr-36"}`}>
                        <strong className="font-semibold">{who}</strong>{" "}
                        {parts.map((p, i) => (p.bold ? <strong key={i} className="font-semibold">{p.text}</strong> : <span key={i}>{p.text}</span>))}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono text-muted md:hidden">{time(l.createdAt)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 font-semibold ${area?.chip ?? "bg-mist text-ink"}`}>{area?.label ?? l.module}</span>
                        {l.recordId && <span className="hidden rounded-md bg-mist px-2 py-0.5 font-mono text-xs text-muted md:inline">#{l.recordId.replace(/-/g, "").slice(0, 8)}</span>}
                        {n && (
                          <span className="flex w-full items-center gap-1 font-medium text-amber-700 md:w-auto">
                            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                            </svg>
                            {n}
                          </span>
                        )}
                      </p>

                      {hasDiff ? (
                        <details open={open} className="group mt-3 md:mt-0">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-2 text-[15px] font-medium hover:bg-mist md:absolute md:top-5 md:right-7 [&::-webkit-details-marker]:hidden">
                            <span className="group-open:hidden">Show changes</span>
                            <span className="hidden group-open:inline">Hide changes</span>
                            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </summary>
                          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                            <table className="hidden w-full table-fixed text-left text-[15px] md:table">
                              <thead className="bg-mist/60 text-sm text-muted">
                                <tr>
                                  <th className="w-[30%] px-5 py-3 font-normal">Field</th>
                                  {d.rows.some((r) => r.before !== null) && <th className="px-3 py-3 font-normal">Before</th>}
                                  {d.rows.some((r) => r.after !== null) && <th className="px-3 py-3 font-normal">After</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line">
                                {d.rows.map((r) => (
                                  <tr key={r.field} className="align-middle">
                                    <th scope="row" className="px-5 py-3 font-semibold">
                                      {r.field}
                                    </th>
                                    {d.rows.some((x) => x.before !== null) && (
                                      <td className="px-3 py-3">
                                        {r.before !== null && (
                                          <span className="inline-flex items-center gap-3">
                                            <span className={`rounded-md px-2 py-0.5 break-words ${r.after !== null ? "bg-red-50 text-red-700 line-through" : "bg-red-50 text-red-700"}`}>{r.before}</span>
                                            {r.after !== null && <span aria-hidden className="text-muted">→</span>}
                                          </span>
                                        )}
                                      </td>
                                    )}
                                    {d.rows.some((x) => x.after !== null) && (
                                      <td className="px-3 py-3">{r.after !== null && <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium break-words text-emerald-800">{r.after}</span>}</td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <ul className="divide-y divide-line md:hidden">
                              {d.rows.map((r) => (
                                <li key={r.field} className="p-4">
                                  <p className="text-sm text-muted">{r.field}</p>
                                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[15px]">
                                    {r.before !== null && <span className={`rounded-md bg-red-50 px-2 py-0.5 text-red-700 ${r.after !== null ? "line-through" : ""}`}>{r.before}</span>}
                                    {r.before !== null && r.after !== null && <span aria-hidden className="text-muted">→</span>}
                                    {r.after !== null && <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">{r.after}</span>}
                                  </p>
                                </li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-3 text-sm text-muted">
                              <span>
                                {d.unchanged.length > 0
                                  ? `${listOf(d.unchanged)} didn't change`
                                  : l.oldValue && l.newValue
                                    ? "Nothing else changed"
                                    : l.newValue
                                      ? "Values when it was created"
                                      : "Values before it was removed"}
                              </span>
                              {href && (
                                <Link href={href} className="hidden font-medium text-teal-800 underline underline-offset-4 md:inline">
                                  Open record →
                                </Link>
                              )}
                            </div>
                          </div>
                        </details>
                      ) : (
                        href && (
                          <Link href={href} className="absolute top-5 right-7 hidden text-[15px] font-medium text-teal-800 underline underline-offset-4 md:inline">
                            Open record →
                          </Link>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[15px] text-muted">
        {before ? <span>Showing {logs.length} older change{logs.length === 1 ? "" : "s"}</span> : <span>Showing the latest {Math.min(PAGE, logs.length)} change{logs.length === 1 ? "" : "s"}</span>}
        {logs.length === PAGE && (
          <Link href={link({ before: logs.at(-1)!.createdAt.toISOString() })} className="font-medium text-teal-800 underline underline-offset-4">
            Show older changes →
          </Link>
        )}
        {before && (
          <Link href={link({ before: undefined })} className="font-medium text-teal-800 underline underline-offset-4">
            Back to latest
          </Link>
        )}
      </p>
    </div>
  );
}
