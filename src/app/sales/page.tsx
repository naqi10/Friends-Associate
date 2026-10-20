import Link from "next/link";
import type { Metadata } from "next";
import { DeniedNotice } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { AutoSelect } from "@/components/sales/AutoSubmit";
import { BulkBar } from "@/components/sales/BulkBar";
import { ContactButtons } from "@/components/sales/ContactButtons";
import { LeadPanel } from "@/components/sales/LeadPanel";
import { STAGE_CHIP, ago, initials, shortDate } from "@/components/sales/ui";
import { assignAllAction, assignLeadAction, bulkLeadAction } from "@/lib/actions/sales-desk";
import { LEAD_SOURCES, LEAD_STATUSES, isKey, labelOf } from "@/lib/catalog";
import { getAssignableStaff, getLead, getLeadActivities, getLeadAttention, getLeadCities, getLeadCounts, getLeadPage, type DeskLead } from "@/lib/data";
import { todayPk } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Sales desk", robots: { index: false, follow: false } };

type Search = {
  denied?: string;
  saved?: string;
  error?: string;
  n?: string;
  status?: string;
  q?: string;
  source?: string;
  city?: string;
  assigned?: string;
  page?: string;
  view?: string;
  lead?: string;
};
type Props = { searchParams: Promise<Search> };

const SAVED: Record<string, string> = {
  deleted: "Lead deleted.",
  stage: "Stage updated.",
  assigned: "Assignment saved.",
  followup: "Follow-up date saved.",
  note: "Note saved.",
  closed: "Lead closed.",
  converted: "Lead converted to a customer.",
};

const FILTER_KEYS = ["status", "q", "source", "city", "assigned", "view"] as const;

export default async function SalesDeskPage({ searchParams }: Props) {
  const { user, can } = await requireStaff("leads", "view");
  const sp = await searchParams;
  const canEdit = can("leads", "update");
  const today = todayPk();
  const status = isKey(LEAD_STATUSES, sp.status) ? sp.status : undefined;
  const source = isKey(LEAD_SOURCES, sp.source) ? sp.source : undefined;
  const view = sp.view === "board" ? "board" : "table";
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = { status, q: sp.q?.slice(0, 80), source, city: sp.city?.slice(0, 60) || undefined, assigned: sp.assigned?.slice(0, 60) || undefined, meId: user.id };

  const [{ rows, total, pages }, counts, attention, cities, staff] = await Promise.all([
    getLeadPage(filter, page, view === "board" ? 500 : 25),
    getLeadCounts(filter),
    getLeadAttention(today),
    getLeadCities(),
    getAssignableStaff(),
  ]);
  const selected = sp.lead ? await getLead(sp.lead) : null;
  const activities = selected ? await getLeadActivities(selected.id) : [];

  // Links keep the current filters; `over` changes some of them.
  const current: Record<string, string | undefined> = { status, q: filter.q, source, city: filter.city, assigned: filter.assigned, view: view === "board" ? "board" : undefined };
  const href = (over: Record<string, string | undefined> = {}, keepLead = false) => {
    const p = new URLSearchParams();
    const merged = { ...current, ...over };
    for (const k of FILTER_KEYS) if (merged[k]) p.set(k, merged[k]!);
    if (over.page && over.page !== "1") p.set("page", over.page);
    if (keepLead && sp.lead && !("lead" in over)) p.set("lead", sp.lead);
    if (over.lead) p.set("lead", over.lead);
    const s = p.toString();
    return s ? `/sales?${s}` : "/sales";
  };
  const returnTo = href(page > 1 ? { page: String(page) } : {}, true);
  const closeHref = href(page > 1 ? { page: String(page) } : {});
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...Object.values(counts));
  const openCount = allCount - (counts.converted ?? 0) - (counts.closed ?? 0);
  const assignedLabel = filter.assigned === "unassigned" ? "Unassigned" : filter.assigned === "me" ? "Me" : staff.find((s) => s.id === filter.assigned)?.name ?? "Anyone";
  const notice = sp.saved === "assigned-all" ? `${sp.n ?? 0} lead${sp.n === "1" ? "" : "s"} shared across the sales team.` : sp.saved === "bulk" ? `${sp.n ?? 0} lead${sp.n === "1" ? "" : "s"} updated.` : sp.saved ? SAVED[sp.saved] : undefined;
  const attentionItems = [
    attention.unassigned > 0 && `${attention.unassigned} lead${attention.unassigned === 1 ? "" : "s"} unassigned`,
    attention.noDate > 0 && `${attention.noDate} follow-up${attention.noDate === 1 ? "" : "s"} without a date`,
    attention.waitingDays >= 2 && `1 new lead waiting ${attention.waitingDays} days`,
    attention.dueToday > 0 && `${attention.dueToday} follow-up${attention.dueToday === 1 ? "" : "s"} due`,
  ].filter(Boolean) as string[];

  const followUp = (l: DeskLead) =>
    l.followUpDate ? (
      <span className={l.followUpDate < today ? "font-semibold text-red-700" : l.followUpDate === today ? "font-semibold text-amber-800" : ""}>
        {l.followUpDate === today ? "Today" : shortDate(l.followUpDate)}
      </span>
    ) : l.status === "follow_up" ? (
      <span className="font-semibold text-amber-800">No date set</span>
    ) : (
      <span className="text-muted">—</span>
    );

  const assignCell = (l: DeskLead) =>
    l.assignedTo ? (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">{initials(l.assignedTo.name)}</span>
        <span className="max-w-[9rem] truncate">{l.assignedTo.name}</span>
      </span>
    ) : canEdit ? (
      <details className="relative">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line-strong px-3.5 py-1.5 text-sm text-body hover:bg-mist">
          <Icon name="plus" className="h-3.5 w-3.5" /> Assign
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-xl">
          {staff.map((s) => (
            <form key={s.id} action={assignLeadAction}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="assigned_to_id" value={s.id} />
              <input type="hidden" name="return" value={returnTo} />
              <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-mist">
                {s.name}
              </button>
            </form>
          ))}
        </div>
      </details>
    ) : (
      <span className="text-sm text-muted">Unassigned</span>
    );

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <DeniedNotice denied={sp.denied} />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight lg:text-[44px]">Sales desk</h1>
          <p className="mt-1 text-[15px] text-muted lg:hidden">
            {openCount} open lead{openCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 hidden text-[15px] text-muted lg:block">Every enquiry from the website — contact, callbacks, sell requests and investors — lands here.</p>
        </div>
        <div className="hidden gap-3 lg:flex">
          <a href={`/api/export/leads${href().replace("/sales", "")}`} className="flex items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 text-[15px] font-semibold hover:bg-mist">
            <Icon name="download" className="h-4.5 w-4.5" /> Export CSV
          </a>
          {can("leads", "add") && (
            <Link href="/sales/leads/new" className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
              <Icon name="plus" className="h-4.5 w-4.5" /> Add lead
            </Link>
          )}
        </div>
      </div>

      {notice && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      <FormError code={sp.error} />

      {/* Needs attention */}
      {attentionItems.length > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-[22px] border border-amber-200 bg-amber-50/70 px-5 py-4 text-amber-900">
          <Icon name="warning" className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 text-[15px]">
            <strong className="mr-3 hidden font-semibold lg:inline">Needs attention</strong>
            {attentionItems.map((t, i) => (
              <span key={t} className={i > 1 ? "hidden lg:inline" : ""}>
                {i > 0 && <span className="mx-2 text-amber-400">·</span>}
                {t}
              </span>
            ))}
          </p>
          {canEdit && attention.unassigned > 0 && (
            <form action={assignAllAction}>
              <input type="hidden" name="return" value={returnTo} />
              <button type="submit" className="font-semibold whitespace-nowrap underline underline-offset-4" title="Share unassigned leads fairly across the sales team">
                Assign all
              </button>
            </form>
          )}
        </div>
      )}

      {/* Stage tabs */}
      <nav aria-label="Stages" className="mt-6 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex gap-2 lg:admin-card lg:gap-0 lg:p-0">
          {[{ key: undefined, label: "All", n: allCount }, ...LEAD_STATUSES.map((s) => ({ key: s.key as string | undefined, label: s.label, n: counts[s.key] ?? 0 }))].map((t, i) => {
            const on = t.key === status;
            return (
              <li key={t.label} className={`shrink-0 lg:flex-1 ${i > 0 ? "lg:border-l lg:border-line" : ""}`}>
                <Link
                  href={href({ status: t.key, page: undefined })}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full border-[1.5px] px-4 py-2.5 text-[15px] whitespace-nowrap lg:block lg:rounded-none lg:border-0 lg:px-5 lg:py-5 ${
                    on ? "border-ink bg-ink text-paper lg:bg-transparent lg:text-ink" : "border-line-strong bg-white lg:bg-transparent"
                  }`}
                >
                  <span className="lg:block lg:truncate lg:text-sm lg:text-muted">{t.label}</span>
                  <span className={`rounded-full px-2 text-sm lg:mt-1 lg:block lg:px-0 lg:text-[30px] lg:leading-none lg:font-semibold ${on ? "bg-white/20 lg:bg-transparent" : "bg-mist lg:bg-transparent"} ${!on && t.n === 0 ? "lg:text-faint" : ""}`}>
                    {t.n}
                  </span>
                  <span aria-hidden className="mt-4 hidden h-1 rounded-full bg-line lg:block">
                    <span className={`block h-1 rounded-full ${on ? "bg-ink" : "bg-faint"}`} style={{ width: `${t.key ? (t.n / maxCount) * 100 : on ? 100 : 0}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Filters */}
      <form method="get" action="/sales" className="mt-5 flex flex-wrap items-center gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        {view === "board" && <input type="hidden" name="view" value="board" />}
        <label className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 focus-within:border-ink lg:max-w-sm">
          <Icon name="search" className="h-5 w-5 text-muted" />
          <input name="q" type="search" defaultValue={filter.q} placeholder="Search name, phone or interest" aria-label="Search leads" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </label>
        <details className="lg:hidden">
          <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white" aria-label="More filters">
            <Icon name="filter" />
          </summary>
          <div className="absolute right-4 left-4 z-20 mt-2 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-xl">
            <FilterSelects source={source} city={filter.city} assigned={filter.assigned} cities={cities} staff={staff} />
          </div>
        </details>
        <div className="hidden flex-wrap gap-3 lg:flex">
          <FilterSelects source={source} city={filter.city} assigned={filter.assigned} cities={cities} staff={staff} />
        </div>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <span className="text-[15px] text-muted">
            {total} lead{total === 1 ? "" : "s"}
            {filter.assigned && ` · ${assignedLabel}`}
          </span>
          <span className="flex rounded-full bg-[#ebe9e4] p-1">
            <Link href={href({ view: undefined })} className={`flex items-center gap-2 rounded-full px-4 py-2 text-[15px] ${view === "table" ? "bg-white font-semibold shadow-sm" : "text-body"}`}>
              <Icon name="table" className="h-4.5 w-4.5" /> Table
            </Link>
            <Link href={href({ view: "board" })} className={`flex items-center gap-2 rounded-full px-4 py-2 text-[15px] ${view === "board" ? "bg-white font-semibold shadow-sm" : "text-body"}`}>
              <Icon name="board" className="h-4.5 w-4.5" /> Board
            </Link>
          </span>
        </div>
      </form>

      <div className={`mt-6 grid items-start gap-6 ${selected ? "xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]" : ""}`}>
        <div className="min-w-0">
          {canEdit && <BulkBar staff={staff} stages={LEAD_STATUSES.map((s) => ({ key: s.key, label: s.label }))} returnTo={returnTo} action={bulkLeadAction} />}

          {rows.length === 0 ? (
            <p className="admin-card px-6 py-12 text-center text-muted">No leads match these filters.</p>
          ) : view === "board" ? (
            <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
              {LEAD_STATUSES.map((s) => {
                const col = rows.filter((l) => l.status === s.key);
                return (
                  <section key={s.key} aria-label={s.label} className="w-72 shrink-0 rounded-[22px] bg-[#ebe9e4] p-3">
                    <h2 className="flex items-center justify-between px-2 py-1 text-sm font-semibold">
                      {s.label} <span className="rounded-full bg-white px-2 text-xs">{col.length}</span>
                    </h2>
                    <ul className="mt-2 space-y-2">
                      {col.map((l) => (
                        <li key={l.id}>
                          <Link href={href({ lead: l.id })} className={`block rounded-2xl bg-white p-4 shadow-sm hover:ring-2 hover:ring-ink/10 ${selected?.id === l.id ? "ring-2 ring-ink" : ""}`}>
                            <p className="font-semibold">{l.name}</p>
                            <p className="truncate text-sm text-body">{l.interest}</p>
                            <p className="mt-2 flex items-center justify-between text-xs text-muted">
                              <span>{l.city || "—"} · {ago(l.createdAt)}</span>
                              <span>{l.assignedTo ? initials(l.assignedTo.name) : "Unassigned"}</span>
                            </p>
                          </Link>
                        </li>
                      ))}
                      {col.length === 0 && <li className="px-2 py-3 text-xs text-muted">No leads</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="admin-card hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className={`w-full text-left text-[15px] ${selected ? "min-w-0" : "min-w-[820px]"}`}>
                  <thead className="bg-[#faf9f7] text-muted">
                    <tr>
                      <th className="w-12 py-3.5 pl-6">{canEdit && <input type="checkbox" data-select-all="1" aria-label="Select all" className="h-4.5 w-4.5" />}</th>
                      <th className="px-3 py-3.5 font-medium">Lead</th>
                      <th className={`px-3 py-3.5 font-medium ${selected ? "hidden 2xl:table-cell" : ""}`}>Interest</th>
                      <th className="px-3 py-3.5 font-medium">Status</th>
                      <th className="px-3 py-3.5 font-medium">Next follow-up</th>
                      <th className="py-3.5 pr-6 pl-3 font-medium">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id} className={`border-t border-line ${selected?.id === l.id ? "bg-paper shadow-[inset_4px_0_0_#0e0e0e]" : "hover:bg-[#fcfbf9]"}`}>
                        <td className="py-4 pl-6">{canEdit && <input type="checkbox" name="ids" value={l.id} form="bulk-form" aria-label={`Select ${l.name}`} className="h-4.5 w-4.5" />}</td>
                        <td className="px-3 py-4">
                          <Link href={href({ lead: l.id })} className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-semibold">{initials(l.name)}</span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold hover:underline">{l.name}</span>
                              <span className="block text-sm text-muted">{l.phone}</span>
                            </span>
                          </Link>
                        </td>
                        <td className={`px-3 py-4 ${selected ? "hidden 2xl:table-cell" : ""}`}>
                          <span className="block max-w-[16rem] truncate">{l.interest}</span>
                          <span className="block text-sm text-muted">
                            {[l.city, shortDate(l.createdAt), ago(l.createdAt)].filter(Boolean).join(" · ")}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${STAGE_CHIP[l.status] ?? "bg-mist"}`}>{labelOf(LEAD_STATUSES, l.status)}</span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">{followUp(l)}</td>
                        <td className="py-4 pr-6 pl-3">
                          {assignCell(l)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pages={pages} shown={rows.length} total={total} href={href} />
            </div>
          )}

          {/* Phone: cards */}
          {rows.length > 0 && (
            <ul className={`space-y-4 lg:hidden`}>
              {rows.map((l) => (
                <li key={l.id} className="admin-card p-5">
                  <Link href={href({ lead: l.id })} className="flex gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist font-semibold">{initials(l.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-lg font-semibold">{l.name}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_CHIP[l.status] ?? "bg-mist"}`}>{labelOf(LEAD_STATUSES, l.status)}</span>
                      </span>
                      <span className="block truncate text-[15px] text-body">
                        {l.interest}
                        {l.city ? ` · ${l.city}` : ""}
                      </span>
                      <span className="block text-sm text-muted">
                        {labelOf(LEAD_SOURCES, l.source)} · {shortDate(l.createdAt)}
                      </span>
                    </span>
                  </Link>
                  <p className="mt-4 flex items-center justify-between rounded-2xl bg-paper px-4 py-3 text-[15px]">
                    <span className="text-muted">Next follow-up</span>
                    {l.followUpDate || l.status === "follow_up" ? followUp(l) : <span>Not needed yet</span>}
                  </p>
                  <div className="mt-4">
                    <ContactButtons leadId={l.id} phone={l.phone} name={l.name} size="sm" assignHref={canEdit && !l.assignedTo ? `${href({ lead: l.id })}#assign` : undefined} email={l.email} />
                  </div>
                </li>
              ))}
              {pages > 1 && (
                <li>
                  <Pager page={page} pages={pages} shown={rows.length} total={total} href={href} />
                </li>
              )}
            </ul>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-mist p-4 pb-28 xl:static xl:z-auto xl:overflow-visible xl:bg-transparent xl:p-0 xl:pb-0">
            <LeadPanel
              lead={selected}
              activities={activities}
              staff={staff}
              canEdit={canEdit}
              canConvert={can("users", "add")}
              returnTo={returnTo}
              closeHref={closeHref}
            />
          </div>
        )}
      </div>

      {/* Phone: floating Add lead */}
      {can("leads", "add") && !selected && (
        <Link href="/sales/leads/new" className="fixed right-4 bottom-24 z-30 flex items-center gap-2 rounded-full bg-ink px-6 py-4 text-base font-semibold text-paper shadow-2xl lg:hidden">
          <Icon name="plus" /> Add lead
        </Link>
      )}
    </div>
  );
}

function FilterSelects({
  source,
  city,
  assigned,
  cities,
  staff,
}: {
  source?: string;
  city?: string;
  assigned?: string;
  cities: string[];
  staff: { id: string; name: string }[];
}) {
  const box = "flex items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white py-1 pr-2 pl-5 text-[15px]";
  const sel = "max-w-[9.5rem] cursor-pointer truncate bg-transparent py-2 pr-1 font-semibold outline-none";
  return (
    <>
      <label className={box}>
        <span className="text-muted">Source</span>
        <AutoSelect name="source" defaultValue={source ?? ""} className={sel}>
          <option value="">All</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </AutoSelect>
      </label>
      <label className={box}>
        <span className="text-muted">City</span>
        <AutoSelect name="city" defaultValue={city ?? ""} className={sel}>
          <option value="">All</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </AutoSelect>
      </label>
      <label className={box}>
        <span className="text-muted">Assigned</span>
        <AutoSelect name="assigned" defaultValue={assigned ?? ""} className={sel}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          <option value="me">Me</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </AutoSelect>
      </label>
    </>
  );
}

function Pager({
  page,
  pages,
  shown,
  total,
  href,
}: {
  page: number;
  pages: number;
  shown: number;
  total: number;
  href: (over: Record<string, string | undefined>) => string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-line px-6 py-4 text-[15px] text-muted">
      <span>
        Showing {shown} of {total}
      </span>
      <span className="flex items-center gap-3">
        {page > 1 && (
          <Link href={href({ page: String(page - 1) })} className="rounded-full border border-line px-3 py-1 hover:bg-mist">
            ← Previous
          </Link>
        )}
        Page {page} of {pages}
        {page < pages && (
          <Link href={href({ page: String(page + 1) })} className="rounded-full border border-line px-3 py-1 hover:bg-mist">
            Next →
          </Link>
        )}
      </span>
    </div>
  );
}
