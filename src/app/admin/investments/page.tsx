import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { setArchivedAction } from "@/lib/actions/lifecycle";
import { setInvestmentStatusAction, toggleInvestmentPublishedAction } from "@/lib/actions/investments";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, labelOf } from "@/lib/catalog";
import { getInvestmentEnquiries, getInvestmentRows } from "@/lib/data";
import { formatDate, formatPkrShort } from "@/lib/format";
import { requireStaffAny } from "@/lib/permissions";

export const metadata = { title: "Investments" };

type Props = { searchParams: Promise<{ saved?: string; error?: string; archived?: string; q?: string }> };

const TYPE_ICON: Record<string, string> = { plaza: "building", residential: "home", shops: "shop", market: "market", other: "building" };
const STATUS_CHIP: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-800",
  fully_subscribed: "bg-amber-50 text-amber-800",
  closed: "bg-mist text-muted",
};
const SAVED: Record<string, string> = {
  "1": "Saved.",
  deleted: "Opportunity deleted.",
  published: "Published on the website.",
  unpublished: "Hidden from the website.",
  status: "Status updated.",
};

const lac = (n: number) => formatPkrShort(n).replace(" L", " Lac");
/** "10 – 50 Lac" or "50 Lac – 1.5 Cr" for the minimums range. */
function range(values: number[]) {
  if (!values.length) return "—";
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const short = (n: number) => lac(n).replace("PKR ", "");
  if (lo === hi) return short(lo);
  const lu = short(lo).split(" ").pop();
  const hu = short(hi).split(" ").pop();
  return lu === hu ? `${short(lo).replace(` ${lu}`, "")} – ${short(hi)}` : `${short(lo)} – ${short(hi)}`;
}

function Switch({ on, label, disabled }: { on: boolean; label: string; disabled?: boolean }) {
  return (
    <button type="submit" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-teal-700" : "bg-line-strong"} disabled:opacity-50`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

export default async function AdminInvestmentsPage({ searchParams }: Props) {
  const { can } = await requireStaffAny([
    ["projects", "update"],
    ["projects", "add"],
  ]);
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const canEdit = can("projects", "update");
  const [rows, archivedRows, activeRows, enquiries] = await Promise.all([
    getInvestmentRows({ archived }),
    getInvestmentRows({ archived: true }),
    archived ? getInvestmentRows() : null,
    getInvestmentEnquiries(),
  ]);
  const active = activeRows ?? rows;
  const q = sp.q?.trim().toLowerCase();
  const list = rows.filter((i) => !q || `${i.title} ${i.location} ${i.city} ${labelOf(INVESTMENT_TYPES, i.investmentType)}`.toLowerCase().includes(q));
  const open = active.filter((i) => i.status === "open");
  const live = active.filter((i) => i.published);
  const enquiryTotal = [...enquiries.values()].reduce((s, e) => s + e.count, 0);
  const returnTo = archived ? "/admin/investments?archived=1" : "/admin/investments";

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex items-start justify-between gap-4 lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">
            <span className="lg:hidden">Investments</span>
            <span className="hidden lg:inline">Investment opportunities</span>
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="lg:hidden">
              {open.length} open · {live.length} live on website · {enquiryTotal} enquir{enquiryTotal === 1 ? "y" : "ies"}
            </span>
            <span className="hidden lg:inline">
              Shown on{" "}
              <Link href="/investment" target="_blank" className="font-mono text-teal-800 underline underline-offset-4">
                /investment
              </Link>
              . Investor interest arrives as leads on the Sales desk.
            </span>
          </p>
        </div>
        {can("projects", "add") && (
          <Link href="/admin/investments/new" className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
            <Icon name="plus" className="h-4.5 w-4.5" /> <span className="lg:hidden">Add</span>
            <span className="hidden lg:inline">Add opportunity</span>
          </Link>
        )}
      </div>
      {sp.saved && SAVED[sp.saved] && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{SAVED[sp.saved]}</p>}
      <FormError code={sp.error} />

      <dl className="admin-card mt-8 hidden grid-cols-4 divide-x divide-line lg:grid">
        {[
          { l: "Open for investment", v: String(open.length) },
          { l: "Live on website", v: `${live.length} of ${active.length}` },
          { l: "Investor enquiries", v: String(enquiryTotal) },
          { l: "Minimums range", v: range(active.map((i) => i.minimumInvestmentPkr)) },
        ].map((s) => (
          <div key={s.l} className="flex flex-col-reverse justify-end p-7">
            <dt className="mb-2 text-[15px] text-muted">{s.l}</dt>
            <dd className="order-last text-[34px] leading-none font-semibold whitespace-nowrap">{s.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 hidden flex-wrap items-center gap-3 lg:flex">
        <form method="get" action="/admin/investments" className="min-w-0 flex-1 lg:max-w-lg">
          {archived && <input type="hidden" name="archived" value="1" />}
          <label className="flex items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 focus-within:border-ink">
            <Icon name="search" className="h-5 w-5 text-muted" />
            <input name="q" type="search" defaultValue={sp.q} placeholder="Search opportunities" aria-label="Search opportunities" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </label>
        </form>
        <nav aria-label="Active or archived" className="ml-auto flex gap-5 text-[15px]">
          <Link href="/admin/investments" className={`pb-1.5 ${!archived ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
            Active ({active.length})
          </Link>
          <Link href="/admin/investments?archived=1" className={`pb-1.5 ${archived ? "border-b-2 border-ink font-semibold" : "text-muted"}`}>
            Archived ({archivedRows.length})
          </Link>
        </nav>
      </div>

      {list.length === 0 ? (
        <p className="admin-card mt-6 px-6 py-12 text-center text-muted">{archived ? "No archived opportunities." : "No opportunities yet."}</p>
      ) : (
        <ul className="mt-6 grid gap-5 xl:grid-cols-2">
          {list.map((i) => {
            const e = enquiries.get(i.id);
            return (
              <li key={i.id} className="admin-card flex flex-col p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mist">
                    <Icon name={TYPE_ICON[i.investmentType] ?? "building"} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold sm:text-[20px]">{i.title}</h2>
                    <p className="text-[15px] text-muted">{labelOf(INVESTMENT_TYPES, i.investmentType)}</p>
                  </div>
                  {canEdit && !archived && (
                    <details className="relative hidden lg:block">
                      <summary aria-label={`More actions for ${i.title}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-mist">
                        <Icon name="more" />
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 w-60 rounded-2xl border border-line bg-white p-2 text-sm shadow-xl">
                        {INVESTMENT_STATUSES.filter((s) => s.key !== i.status).map((s) => (
                          <form key={s.key} action={setInvestmentStatusAction}>
                            <input type="hidden" name="id" value={i.id} />
                            <input type="hidden" name="status" value={s.key} />
                            <input type="hidden" name="return" value={returnTo} />
                            <button type="submit" className="w-full rounded-xl px-3 py-2 text-left hover:bg-mist">
                              Mark as {s.label.toLowerCase()}
                            </button>
                          </form>
                        ))}
                        <form action={setArchivedAction}>
                          <input type="hidden" name="kind" value="investment" />
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="archived" value="1" />
                          <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-red-700 hover:bg-mist">
                            Archive
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </div>

                <div className="mt-5 flex items-end justify-between gap-3 rounded-[20px] bg-paper p-5">
                  <div>
                    <p className="text-sm text-muted">
                      <span className="lg:hidden">Minimum</span>
                      <span className="hidden lg:inline">Minimum investment</span>
                    </p>
                    <p className="mt-1 text-[26px] leading-none font-semibold lg:text-[30px]">{lac(i.minimumInvestmentPkr)}</p>
                    <p className="mt-1 hidden text-sm text-muted lg:block">PKR {i.minimumInvestmentPkr.toLocaleString("en-PK")}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CHIP[i.status] ?? "bg-mist"}`}>
                    <span className="hidden h-1.5 w-1.5 rounded-full bg-current lg:inline" />
                    <span className="lg:hidden">{i.status === "open" ? "Open" : labelOf(INVESTMENT_STATUSES, i.status)}</span>
                    <span className="hidden lg:inline">{labelOf(INVESTMENT_STATUSES, i.status)}</span>
                  </span>
                </div>

                <p className="mt-4 hidden items-center justify-between gap-3 border-b border-line pb-4 text-[15px] lg:flex">
                  <span className="flex items-center gap-2.5 text-body">
                    <Icon name="user" className="h-5 w-5 text-muted" />
                    {e ? `${e.count} investor enquir${e.count === 1 ? "y" : "ies"}${e.latest ? ` · latest ${formatDate(e.latest.toISOString())}` : ""}` : "No investor enquiries yet"}
                  </span>
                  {can("leads", "view") && (
                    <Link href="/sales?source=investment" className="text-sm text-teal-800 underline underline-offset-4">
                      Sales desk →
                    </Link>
                  )}
                </p>
                {i.figuresReviewedOn && <p className="mt-3 hidden text-xs text-muted lg:block">Figures last reviewed {formatDate(i.figuresReviewedOn)}</p>}

                <div className="mt-4 flex items-center gap-3">
                  {archived ? (
                    <Link href={`/admin/investments/${i.id}`} className="rounded-full border-[1.5px] border-line-strong px-5 py-2.5 text-[15px] font-semibold hover:bg-mist">
                      Open to restore
                    </Link>
                  ) : (
                    <>
                      <form action={toggleInvestmentPublishedAction} className="flex flex-1 items-center gap-3 max-lg:flex-row-reverse max-lg:justify-between">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="return" value={returnTo} />
                        <Switch on={i.published} disabled={!canEdit} label={`${i.title}: ${i.published ? "published" : "hidden"} on website`} />
                        <span className="text-[15px]">{i.published ? "Published on website" : "Hidden from website"}</span>
                      </form>
                      {canEdit && (
                        <Link href={`/admin/investments/${i.id}`} className="hidden rounded-full border-[1.5px] border-line-strong px-5 py-2.5 text-[15px] font-semibold hover:bg-mist lg:block">
                          Edit
                        </Link>
                      )}
                      {i.published && (
                        <Link href={`/investment/${i.slug}`} target="_blank" aria-label={`View ${i.title} on the website`} className="hidden h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-line-strong hover:bg-mist lg:flex">
                          <Icon name="external" />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 hidden items-center gap-2 text-[15px] text-muted lg:flex">
        <Icon name="alert" className="h-4.5 w-4.5" /> Keep figures factual and dated. Update the “Figures last reviewed” date in each opportunity&apos;s edit screen whenever you check them.
      </p>
    </div>
  );
}
