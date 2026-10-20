import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { AutoSelect } from "@/components/sales/AutoSubmit";
import { initials } from "@/components/sales/ui";
import { setCustomerActiveAction, setDownloadFeeAction } from "@/lib/actions/customers";
import { getCustomerDirectory, getCustomerStats, type CustomerFilter, type DirectoryRow } from "@/lib/data";
import { formatDate, formatPkr, formatPkrShort, todayPk } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Customers" };

type Search = { error?: string; saved?: string; q?: string; city?: string; downloads?: string; account?: string; sort?: string; page?: string };
type Props = { searchParams: Promise<Search> };

const SAVED: Record<string, string> = {
  deleted: "Customer deleted.",
  fee: "Document download access updated.",
  enabled: "Account switched on. The customer can sign in again.",
  disabled: "Account switched off. The customer was signed out everywhere.",
};

function dueBadge(r: DirectoryRow) {
  if (!r.next) return r.bookings > 0 ? { text: "Fully paid", cls: "text-emerald-700", chip: "bg-emerald-50 text-emerald-800" } : null;
  const d = r.next.daysUntil;
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} overdue`, cls: "text-red-700 font-semibold", chip: "bg-red-50 text-red-700" };
  const date = formatDate(r.next.date).replace(/ \d{4}$/, "");
  return { text: `Next due ${date}`, cls: "text-muted", chip: "bg-amber-50 text-amber-800", short: `Due ${date}` };
}

/** On/off switch that submits its own little form (works without JavaScript). */
function Switch({ on, label, disabled }: { on: boolean; label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-teal-700" : "bg-line-strong"} disabled:opacity-50`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { can } = await requireStaff("users", "view");
  const sp = await searchParams;
  const canEdit = can("users", "update");
  const today = todayPk();
  const filter: CustomerFilter = {
    q: sp.q?.slice(0, 80) || undefined,
    city: sp.city?.slice(0, 60) || undefined,
    downloads: sp.downloads === "unlocked" ? "unlocked" : sp.downloads === "locked" ? "locked" : undefined,
    account: sp.account === "disabled" ? "disabled" : sp.account === "all" ? "all" : "active",
    sort: sp.sort === "name" ? "name" : "outstanding",
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, pages }, stats] = await Promise.all([getCustomerDirectory(filter, page, today), getCustomerStats()]);

  const query = (over: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: filter.q,
      city: filter.city,
      downloads: filter.downloads,
      account: filter.account === "active" ? undefined : filter.account,
      sort: filter.sort === "name" ? "name" : undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return p.toString();
  };
  const href = (over: Record<string, string | undefined> = {}) => (query(over) ? `/admin/customers?${query(over)}` : "/admin/customers");
  const returnTo = href(page > 1 ? { page: String(page) } : {});

  const toggles = (r: DirectoryRow, compact = false) => (
    <form action={setDownloadFeeAction} className="flex items-center gap-3">
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="paid" value={r.unlocked ? "0" : "1"} />
      <input type="hidden" name="return" value={returnTo} />
      {compact && (
        <span className="flex-1 text-[15px]">
          Document downloads · <span className="text-muted">{r.unlocked ? "Unlocked" : "Locked"}</span>
        </span>
      )}
      <Switch on={r.unlocked} label={`Document downloads for ${r.name}: ${r.unlocked ? "unlocked" : "locked"}`} disabled={!canEdit} />
      {!compact && <span className="hidden text-[15px] 2xl:inline">{r.unlocked ? "Unlocked" : "Locked"}</span>}
    </form>
  );

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold tracking-tight lg:text-[44px]">Customers</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">Buyer accounts and document access</span>
            <span className="hidden lg:inline">Buyer accounts, document download access and passwords.</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <a href={`/api/export/customers?${query()}`} className="hidden items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 text-[15px] font-semibold hover:bg-mist lg:flex">
            <Icon name="download" className="h-4.5 w-4.5" /> Export CSV
          </a>
          {can("users", "add") && (
            <Link href="/admin/customers/new" className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
              <Icon name="plus" className="h-4.5 w-4.5" /> <span className="lg:hidden">Add</span>
              <span className="hidden lg:inline">Add customer</span>
            </Link>
          )}
        </div>
      </div>

      {sp.saved && SAVED[sp.saved] && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{SAVED[sp.saved]}</p>}
      <FormError code={sp.error} />

      {/* Stats */}
      <dl className="admin-card mt-6 grid grid-cols-3 divide-x divide-line lg:grid-cols-4">
        {[
          { l: "Customers", v: String(stats.customers) },
          { l: "Active bookings", v: String(stats.activeBookings), desk: true },
          { l: "Total outstanding", m: "Outstanding", v: formatPkr(stats.outstandingPkr), short: formatPkr(stats.outstandingPkr).replace("PKR ", "") },
          { l: "Downloads locked", m: "Locked", v: String(stats.locked), warn: stats.locked > 0 },
        ].map((s) => (
          <div key={s.l} className={`flex flex-col-reverse justify-end p-4 lg:p-7 ${s.desk ? "hidden lg:flex" : ""}`}>
            <dt className="mt-1 text-sm text-muted lg:mt-0 lg:mb-2">
              <span className="lg:hidden">{s.m ?? s.l}</span>
              <span className="hidden lg:inline">{s.l}</span>
            </dt>
            <dd className={`text-[22px] leading-none font-semibold whitespace-nowrap sm:text-[26px] lg:order-last lg:text-[34px] ${s.warn ? "text-amber-700" : ""}`}>
              <span className="lg:hidden">{s.short ?? s.v}</span>
              <span className="hidden lg:inline">{s.v}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <form method="get" action="/admin/customers" className="mt-5 flex flex-wrap items-center gap-3">
        {filter.sort === "name" && <input type="hidden" name="sort" value="name" />}
        <label className="flex min-w-0 flex-1 basis-64 items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 focus-within:border-ink lg:max-w-lg">
          <Icon name="search" className="h-5 w-5 text-muted" />
          <input name="q" type="search" defaultValue={filter.q} placeholder="Name, phone, email or property" aria-label="Search customers" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </label>
        <div className="hidden flex-wrap gap-3 lg:flex">
          {[
            { name: "city", label: "City", value: filter.city ?? "", options: [["", "All"], ...stats.cities.map((c) => [c, c])] },
            { name: "downloads", label: "Downloads", value: filter.downloads ?? "", options: [["", "All"], ["unlocked", "Unlocked"], ["locked", "Locked"]] },
            { name: "account", label: "Account", value: filter.account ?? "active", options: [["active", "Active"], ["disabled", "Disabled"], ["all", "All"]] },
          ].map((f) => (
            <label key={f.name} className="flex items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white py-1 pr-2 pl-5 text-[15px]">
              <span className="text-muted">{f.label}</span>
              <AutoSelect name={f.name} defaultValue={f.value} className="cursor-pointer bg-transparent py-2 pr-1 font-semibold outline-none">
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </AutoSelect>
            </label>
          ))}
        </div>
        <span className="ml-auto hidden text-[15px] text-muted lg:inline">
          {total} customer{total === 1 ? "" : "s"}
        </span>
      </form>

      {rows.length === 0 ? (
        <p className="admin-card mt-6 px-6 py-12 text-center text-muted">No customers match these filters.</p>
      ) : (
        <>
          {/* Computer: table */}
          <div className="admin-card mt-6 hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-[15px]">
                <thead className="bg-[#faf9f7] text-muted">
                  <tr>
                    <th className="py-3.5 pr-3 pl-6 font-medium">
                      <Link href={href({ sort: "name", page: undefined })} className="hover:text-ink">
                        Customer{filter.sort === "name" && " ↓"}
                      </Link>
                    </th>
                    <th className="hidden px-3 py-3.5 font-medium 2xl:table-cell">Phone · City</th>
                    <th className="px-3 py-3.5 font-medium">Property</th>
                    <th className="px-3 py-3.5 text-right font-medium">
                      <Link href={href({ sort: undefined, page: undefined })} className="hover:text-ink">
                        Outstanding{filter.sort !== "name" && " ↓"}
                      </Link>
                    </th>
                    <th className="px-3 py-3.5 font-medium">Downloads</th>
                    <th className="px-3 py-3.5 font-medium">Account</th>
                    <th className="py-3.5 pr-7 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const due = dueBadge(r);
                    return (
                      <tr key={r.id} className="border-t border-line hover:bg-[#fcfbf9]">
                        <td className="py-4 pr-3 pl-6">
                          <Link href={`/admin/customers/${r.id}`} className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper min-[1440px]:h-12 min-[1440px]:w-12">{initials(r.name)}</span>
                            <span className="min-w-0">
                              <span className="block max-w-[10.5rem] truncate font-semibold hover:underline min-[1440px]:max-w-none">{r.name}</span>
                              <span className="hidden max-w-none truncate text-sm text-muted 2xl:block">{r.email}</span>
                              <span className="block max-w-[10.5rem] truncate text-sm text-muted min-[1440px]:max-w-[14rem] 2xl:hidden">
                                {[r.phone, r.city].filter(Boolean).join(" · ") || r.email}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="hidden px-3 py-4 2xl:table-cell">
                          <span className="block whitespace-nowrap">{r.phone || "—"}</span>
                          <span className="block text-sm text-muted">{r.city}</span>
                        </td>
                        <td className="px-3 py-4">
                          <span className="block max-w-[8.5rem] truncate min-[1440px]:max-w-[11rem] 2xl:max-w-[16rem]">{r.property ?? <span className="text-muted">No booking yet</span>}</span>
                          {r.bookings > 0 && (
                            <span className="block text-sm text-muted">
                              {r.bookings} booking{r.bookings === 1 ? "" : "s"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <span className="block font-semibold whitespace-nowrap">{r.outstandingPkr ? formatPkr(r.outstandingPkr) : "—"}</span>
                          {due && <span className={`block text-sm whitespace-nowrap ${due.cls}`}>{due.text}</span>}
                        </td>
                        <td className="px-3 py-4">{toggles(r)}</td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${r.active ? "bg-emerald-50 text-emerald-800" : "bg-mist text-muted"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${r.active ? "bg-emerald-600" : "bg-faint"}`} />
                            {r.active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-4 pr-5 pl-2">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/customers/${r.id}`} className="rounded-full border-[1.5px] border-line-strong px-3.5 py-2 text-sm font-semibold whitespace-nowrap hover:bg-mist">
                              <span className="2xl:hidden">View</span>
                              <span className="hidden 2xl:inline">View profile</span>
                            </Link>
                            <details className="relative">
                              <summary aria-label={`More actions for ${r.name}`} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line hover:bg-mist">
                                <Icon name="dots" />
                              </summary>
                              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-white p-2 text-sm shadow-xl">
                                {can("bookings", "add") && r.active && (
                                  <Link href={`/admin/bookings/new?buyer=${r.id}`} className="block rounded-xl px-3 py-2 hover:bg-mist">
                                    New booking
                                  </Link>
                                )}
                                {canEdit && (
                                  <Link href={`/admin/customers/${r.id}#password`} className="block rounded-xl px-3 py-2 hover:bg-mist">
                                    Reset password
                                  </Link>
                                )}
                                {canEdit && (
                                  <form action={setCustomerActiveAction}>
                                    <input type="hidden" name="id" value={r.id} />
                                    <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                                    <input type="hidden" name="return" value={returnTo} />
                                    <button type="submit" className={`w-full rounded-xl px-3 py-2 text-left hover:bg-mist ${r.active ? "text-red-700" : ""}`}>
                                      {r.active ? "Switch account off" : "Switch account on"}
                                    </button>
                                  </form>
                                )}
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-7 py-4 text-[15px] text-muted">
              <span>
                Showing {(page - 1) * 25 + 1}–{(page - 1) * 25 + rows.length} of {total}
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
          </div>

          {/* Phone: cards */}
          <ul className="mt-5 space-y-4 lg:hidden">
            {rows.map((r) => {
              const due = dueBadge(r);
              return (
                <li key={r.id} className="admin-card p-5">
                  <Link href={`/admin/customers/${r.id}`} className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-paper">{initials(r.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-semibold">{r.name}</span>
                      <span className="block truncate text-[15px] text-muted">
                        {r.phone || r.email}
                        {r.city ? ` · ${r.city}` : ""}
                      </span>
                    </span>
                    <Icon name="chevron" className="h-5 w-5 text-muted" />
                  </Link>
                  {r.property && (
                    <div className="mt-4 rounded-2xl bg-paper p-4">
                      <p className="truncate text-[15px] text-body">{r.property}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xl font-semibold">{r.outstandingPkr ? formatPkrShort(r.outstandingPkr) : "Paid"}</p>
                        {due && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${due.chip}`}>{due.short ?? due.text}</span>}
                      </div>
                    </div>
                  )}
                  <div className="mt-4">{toggles(r, true)}</div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
