import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Icon } from "@/components/admin/shell/icons";
import { AutoSelect } from "@/components/sales/AutoSubmit";
import { initials } from "@/components/sales/ui";
import { recordPaymentAction, sendPaymentReminderAction } from "@/lib/actions/bookings";
import { PAYMENT_METHODS } from "@/lib/catalog";
import { filterDesk, getBookingDesk, lastPaymentReminder, type DeskBooking, type DeskTab } from "@/lib/data";
import { formatDate, formatPkr, formatPkrShort, todayPk } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Bookings & payments" };

type Search = { tab?: string; q?: string; project?: string; b?: string; saved?: string; error?: string; receipt?: string; warn?: string };
type Props = { searchParams: Promise<Search> };

const TABS: { key: DeskTab; label: string; short?: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "paid", label: "Paid up" },
];

function due(b: DeskBooking) {
  if (b.daysUntil === null) return { text: "Paid up", chip: "bg-emerald-50 text-emerald-800", box: "bg-emerald-50 text-emerald-900" };
  const d = b.daysUntil;
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} overdue`, chip: "bg-red-50 text-red-700", box: "bg-red-50/80 text-red-900" };
  if (d === 0) return { text: "Due today", chip: "bg-amber-50 text-amber-800", box: "bg-amber-50 text-amber-900" };
  if (d === 1) return { text: "Due tomorrow", chip: "bg-amber-50 text-amber-800", box: "bg-amber-50 text-amber-900" };
  return { text: `Due in ${d} days`, chip: "bg-mist text-body", box: "bg-paper text-ink" };
}

/** A reminder can be sent once per booking per day (the server enforces the same rule). */
function sentWithinADay(at: Date | null) {
  return !!at && Date.now() - at.getTime() < 24 * 3600 * 1000;
}

/** Table amounts as in the office's sheets: crores with two decimals ("PKR 9.80 Cr"), lakhs as "PKR 55.5 Lac". */
const money = (n: number) => (n >= 10_000_000 ? formatPkr(n) : formatPkrShort(n).replace(" L", " Lac"));

const pct = (b: { paidPkr: number; totalPkr: number }) => (b.totalPkr ? Math.round((b.paidPkr / b.totalPkr) * 100) : 0);
const shortDay = (iso: string) => formatDate(iso).replace(/ \d{4}$/, "");

function Bar({ value, dark = false }: { value: number; dark?: boolean }) {
  return (
    <span aria-hidden className={`block h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-line"}`}>
      <span className={`block h-full rounded-full ${dark ? "bg-teal-400" : "bg-teal-700"}`} style={{ width: `${Math.min(100, value)}%` }} />
    </span>
  );
}

export default async function BookingsDeskPage({ searchParams }: Props) {
  const { can } = await requireStaff("bookings", "view");
  const sp = await searchParams;
  const today = todayPk();
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "all") as DeskTab;
  const desk = await getBookingDesk(today);
  const rows = filterDesk(desk.all, tab, sp.q, sp.project);
  const canPay = can("payments", "add");
  const canRemind = can("bookings", "update");
  const selected = desk.all.find((b) => b.id === sp.b) ?? (sp.b ? undefined : rows[0]);
  const lastReminder = selected && canRemind ? await lastPaymentReminder(selected.buyer.id, selected.id) : null;
  const remindedToday = sentWithinADay(lastReminder);
  const f = desk.figures;
  const collected = f.bookedPkr ? Math.round((f.receivedPkr / f.bookedPkr) * 100) : 0;

  const href = (over: Partial<Record<"tab" | "q" | "project" | "b", string | undefined>> = {}) => {
    const p = new URLSearchParams();
    const m = { tab: tab === "all" ? undefined : tab, q: sp.q || undefined, project: sp.project || undefined, b: sp.b, ...over };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/bookings?${s}` : "/admin/bookings";
  };
  const returnTo = href({ b: selected?.id });
  const notice =
    sp.saved === "payment"
      ? "Payment recorded with its own receipt. The buyer was notified in their portal."
      : sp.saved === "reminded"
        ? "Reminder sent to the buyer's portal."
        : undefined;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 lg:items-end">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-tight lg:text-[44px]">Bookings &amp; payments</h1>
          <p className="mt-1 flex items-center gap-2 text-[15px] text-muted">
            <Icon name="alert" className="hidden h-4.5 w-4.5 lg:block" />
            <span className="lg:hidden">Buyers see these figures in their portal</span>
            <span className="hidden lg:inline">Buyers see these figures in their portal. There is no online checkout.</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <a href="/api/export/bookings" className="hidden items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 text-[15px] font-semibold hover:bg-mist lg:flex">
            <Icon name="download" className="h-4.5 w-4.5" /> Export CSV
          </a>
          {can("bookings", "add") && (
            <Link href="/admin/bookings/new" className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-body">
              <Icon name="plus" className="h-4.5 w-4.5" /> <span className="lg:hidden">Booking</span>
              <span className="hidden lg:inline">New booking</span>
            </Link>
          )}
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}{" "}
          {sp.receipt && (
            <Link href={`/admin/bookings/${selected?.id}/receipts/${sp.receipt}`} className="font-semibold underline">
              Open receipt
            </Link>
          )}
        </p>
      )}
      {sp.warn === "receipt" && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The payment is saved, but the attached receipt file could not be stored (file storage is not set up on this server). Upload it later under Documents.
        </p>
      )}
      <FormError code={sp.error} />

      {/* Figures: computer */}
      <div className="mt-8 hidden gap-5 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        <div className="admin-card p-7">
          <p className="text-[15px] text-muted">Total booked value</p>
          <p className="mt-3 text-[clamp(28px,2.4vw,40px)] leading-none font-semibold whitespace-nowrap">{formatPkr(f.bookedPkr)}</p>
          <p className="mt-4 text-[15px] text-muted">
            {desk.tabs.all} active booking{desk.tabs.all === 1 ? "" : "s"}
          </p>
        </div>
        <div className="admin-card p-7">
          <p className="text-[15px] text-muted">Received</p>
          <p className="mt-3 text-[clamp(28px,2.4vw,40px)] leading-none font-semibold whitespace-nowrap">{formatPkr(f.receivedPkr)}</p>
          <div className="mt-5">
            <Bar value={collected} />
          </div>
          <p className="mt-2 text-[15px] text-muted">{collected}% collected</p>
        </div>
        <div className="rounded-[28px] bg-ink p-7 text-paper shadow-[0_18px_40px_-18px_rgb(14_14_14/0.5)]">
          <p className="text-[15px] text-dim">Outstanding</p>
          <p className="mt-3 text-[clamp(28px,2.4vw,40px)] leading-none font-semibold whitespace-nowrap">{formatPkr(f.outstandingPkr)}</p>
          <p className="mt-4 text-[15px] text-dim">
            Across {f.buyersOwing} buyer{f.buyersOwing === 1 ? "" : "s"}
          </p>
        </div>
        <div className={`rounded-[28px] border-2 p-7 ${f.overdueCount ? "border-red-200 bg-red-50/60 text-red-900" : "border-white bg-white"}`}>
          <p className="text-[15px]">Overdue</p>
          <p className={`mt-3 text-[clamp(28px,2.4vw,40px)] leading-none font-semibold whitespace-nowrap ${f.overdueCount ? "text-red-700" : ""}`}>{formatPkr(f.overduePkr)}</p>
          <p className="mt-4 text-[15px]">
            {f.overdueCount} instalment{f.overdueCount === 1 ? "" : "s"}
            {f.dueTodayCount > 0 && ` · ${f.dueTodayCount} more due today`}
          </p>
        </div>
      </div>

      {/* Figures: phone */}
      <div className="mt-6 rounded-[26px] bg-ink p-6 text-paper lg:hidden">
        <p className="text-sm text-dim">Outstanding</p>
        <p className="mt-2 text-[34px] leading-tight font-semibold">{formatPkr(f.outstandingPkr)}</p>
        <div className="mt-4">
          <Bar value={collected} dark />
        </div>
        <p className="mt-2 flex justify-between text-sm text-dim">
          <span>
            {formatPkr(f.receivedPkr).replace("PKR ", "")} received of {formatPkr(f.bookedPkr).replace("PKR ", "")}
          </span>
          <span>{collected}%</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {f.overdueCount > 0 && <span className="rounded-full bg-red-900/60 px-2.5 py-1 text-red-100">{formatPkr(f.overduePkr).replace("PKR ", "")} overdue</span>}
          {f.dueTodayCount > 0 && <span className="rounded-full bg-white/10 px-2.5 py-1">{f.dueTodayCount} due today</span>}
        </div>
      </div>

      {/* Tabs + filters */}
      <form method="get" action="/admin/bookings" className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8">
        {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
        <nav aria-label="Filter bookings" className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:w-auto lg:px-0">
          <ul className="flex gap-2 lg:gap-1 lg:rounded-full lg:bg-[#ebe9e4] lg:p-1.5">
            {TABS.map((t) => {
              const on = t.key === tab;
              const n = desk.tabs[t.key];
              return (
                <li key={t.key} className="shrink-0">
                  <Link
                    href={href({ tab: t.key === "all" ? undefined : t.key, b: undefined })}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full border-[1.5px] px-4 py-2.5 text-[15px] whitespace-nowrap lg:border-0 ${
                      on ? "border-ink bg-ink text-paper lg:bg-white lg:font-semibold lg:text-ink lg:shadow-sm" : "border-line-strong bg-white text-body lg:bg-transparent"
                    }`}
                  >
                    {t.label}
                    <span className={`rounded-full px-2 text-sm ${t.key === "overdue" && n ? "bg-red-50 text-red-700" : on ? "bg-white/20 lg:bg-mist" : "bg-mist"}`}>{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <label className="hidden min-w-0 flex-1 basis-56 items-center gap-3 rounded-full border-[1.5px] border-line-strong bg-white px-5 py-3 focus-within:border-ink lg:flex lg:max-w-md">
          <Icon name="search" className="h-5 w-5 text-muted" />
          <input name="q" type="search" defaultValue={sp.q} placeholder="Buyer, property or project" aria-label="Search bookings" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        </label>
        <label className="hidden items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white py-1 pr-2 pl-5 text-[15px] lg:flex">
          <span className="text-muted">Project</span>
          <AutoSelect name="project" defaultValue={sp.project ?? ""} className="max-w-[14rem] cursor-pointer truncate bg-transparent py-2 pr-1 font-semibold outline-none">
            <option value="">All</option>
            {desk.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </AutoSelect>
        </label>
        <span className="ml-auto hidden text-[15px] text-muted lg:inline">
          {rows.length} booking{rows.length === 1 ? "" : "s"}
        </span>
      </form>

      {rows.length === 0 ? (
        <p className="admin-card mt-6 px-6 py-12 text-center text-muted">No bookings here.</p>
      ) : (
        <>
          {/* Computer: table */}
          <div className="admin-card mt-6 hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <thead className="bg-[#faf9f7] text-muted">
                  <tr>
                    <th className="py-3.5 pr-3 pl-6 font-medium">Booking</th>
                    <th className="px-3 py-3.5 font-medium">Collected</th>
                    <th className="px-3 py-3.5 text-right font-medium">Outstanding</th>
                    <th className="px-3 py-3.5 font-medium">Next instalment</th>
                    <th className="py-3.5 pr-6 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => {
                    const d = due(b);
                    const on = selected?.id === b.id;
                    return (
                      <tr key={b.id} className={`border-t border-line ${on ? "bg-paper shadow-[inset_4px_0_0_#0e0e0e]" : "hover:bg-[#fcfbf9]"}`}>
                        <td className="py-4 pr-3 pl-6">
                          <Link href={href({ b: b.id })} scroll={false} className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">{initials(b.buyer.name)}</span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold hover:underline">{b.buyer.name}</span>
                              <span className="block max-w-[15rem] truncate">{b.property}</span>
                              <span className="block max-w-[15rem] truncate text-sm text-muted">{b.project.name}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="w-[26%] px-3 py-4">
                          <span className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="whitespace-nowrap">
                              <strong className="font-semibold">{money(b.paidPkr)}</strong>{" "}
                              <span className="text-muted">of {money(b.totalPkr)}</span>
                            </span>
                            <span className="text-muted">{pct(b)}%</span>
                          </span>
                          <span className="mt-2 block">
                            <Bar value={pct(b)} />
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-semibold whitespace-nowrap">{b.outstandingPkr ? formatPkr(b.outstandingPkr) : "—"}</td>
                        <td className="px-3 py-4">
                          {b.daysUntil === null ? (
                            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${d.chip}`}>{d.text}</span>
                          ) : (
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>
                                <span className="block font-semibold whitespace-nowrap">{money(b.nextAmountPkr)}</span>
                                <span className="block text-sm whitespace-nowrap text-muted">{formatDate(b.nextDate)}</span>
                              </span>
                              <span className={`rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${d.chip}`}>{d.text}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-6 pl-3 text-right">
                          {canPay && b.outstandingPkr > 0 && (
                            <Link href={`${href({ b: b.id })}#pay`} className="rounded-full border-[1.5px] border-line-strong bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap hover:bg-mist">
                              <span className="min-[1440px]:hidden">Record</span>
                              <span className="hidden min-[1440px]:inline">Record payment</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phone: cards */}
          <ul className="mt-5 space-y-4 lg:hidden">
            {rows.map((b) => {
              const d = due(b);
              return (
                <li key={b.id} className="admin-card p-5">
                  <Link href={`/admin/bookings/${b.id}`} className="flex gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-paper">{initials(b.buyer.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-lg font-semibold">{b.buyer.name}</span>
                        <span className="shrink-0 text-lg font-semibold">{b.outstandingPkr ? formatPkrShort(b.outstandingPkr) : "Paid"}</span>
                      </span>
                      <span className="block truncate text-[15px] text-body">{b.property}</span>
                      <span className="block truncate text-sm text-muted">{b.project.name}</span>
                    </span>
                  </Link>
                  <div className="mt-4">
                    <Bar value={pct(b)} />
                    <p className="mt-2 flex justify-between text-sm text-muted">
                      <span>
                        {formatPkrShort(b.paidPkr).replace("PKR ", "")} of {formatPkrShort(b.totalPkr).replace("PKR ", "")}
                      </span>
                      <span>{pct(b)}% paid</span>
                    </p>
                  </div>
                  {b.daysUntil !== null && (
                    <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${d.box}`}>
                      <span>
                        <span className="block text-sm">Next instalment · {shortDay(b.nextDate)}</span>
                        <span className="block text-xl font-semibold">PKR {b.nextAmountPkr.toLocaleString("en-PK")}</span>
                      </span>
                      <span className="text-sm font-semibold">{d.text}</span>
                    </div>
                  )}
                  {b.outstandingPkr > 0 && (canPay || canRemind) && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {canPay && (
                        <Link href={`/admin/bookings/${b.id}#pay`} className="rounded-full bg-ink py-3 text-center text-[15px] font-semibold text-paper">
                          Record payment
                        </Link>
                      )}
                      {canRemind && (
                        <form action={sendPaymentReminderAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="return" value={href()} />
                          <button type="submit" className="w-full rounded-full border-[1.5px] border-line-strong bg-white py-3 text-[15px] font-semibold">
                            Send reminder
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Selected booking (computer) */}
      {selected && (
        <section id="pay" aria-label={`Booking of ${selected.buyer.name}`} className="admin-card mt-6 hidden scroll-mt-24 p-7 lg:block">
          <div className="grid gap-8 xl:grid-cols-[1fr_1fr_1fr]">
            <div>
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper">{initials(selected.buyer.name)}</span>
                <div className="min-w-0">
                  <h2 className="text-[22px] font-semibold">{selected.buyer.name}</h2>
                  <p className="text-[15px] text-muted">
                    {selected.property} · {selected.project.name}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm text-muted">Outstanding</p>
              <p className="text-[36px] leading-tight font-semibold">{formatPkr(selected.outstandingPkr)}</p>
              <div className="mt-4">
                <Bar value={pct(selected)} />
              </div>
              <p className="mt-2 flex justify-between text-[15px] text-muted">
                <span>
                  {formatPkr(selected.paidPkr)} paid of {formatPkr(selected.totalPkr)}
                </span>
                <span>{pct(selected)}%</span>
              </p>
              <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                {can("users", "view") && (
                  <Link href={`/admin/customers/${selected.buyer.id}`} className="text-teal-800 underline underline-offset-4">
                    View customer
                  </Link>
                )}
                <Link href={`/admin/bookings/${selected.id}`} className="text-teal-800 underline underline-offset-4">
                  Payment history
                </Link>
                {can("documents", "add") && (
                  <Link href={`/admin/documents?buyer=${selected.buyer.id}`} className="text-teal-800 underline underline-offset-4">
                    Booking documents
                  </Link>
                )}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Next instalment</h3>
              {selected.daysUntil === null ? (
                <p className="mt-3 rounded-[20px] bg-emerald-50 p-5 text-emerald-900">Fully paid. Nothing is due.</p>
              ) : (
                <>
                  <div className={`mt-3 rounded-[20px] border p-5 ${selected.daysUntil < 0 ? "border-red-200" : "border-transparent"} ${due(selected).box}`}>
                    <p className="text-[28px] leading-tight font-semibold">PKR {selected.nextAmountPkr.toLocaleString("en-PK")}</p>
                    <p className="mt-1 text-[15px]">
                      Due {formatDate(selected.nextDate)} · <strong>{due(selected).text}</strong>
                    </p>
                  </div>
                  {canRemind && (
                    <form action={sendPaymentReminderAction} className="mt-4">
                      <input type="hidden" name="id" value={selected.id} />
                      <input type="hidden" name="return" value={returnTo} />
                      <button
                        type="submit"
                        disabled={remindedToday}
                        className="flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-line-strong bg-white py-3 text-[15px] font-semibold hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="bell" className="h-4.5 w-4.5" /> {remindedToday ? "Reminder sent today" : "Send portal reminder"}
                      </button>
                    </form>
                  )}
                  <p className="mt-3 text-sm text-muted">
                    The reminder appears in the buyer&apos;s portal{lastReminder ? ` (last sent ${lastReminder.toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})` : ""}. Amounts are never sent over WhatsApp.
                  </p>
                </>
              )}
            </div>

            <div className="rounded-[24px] bg-paper p-6">
              <h3 className="text-lg font-semibold">Record a payment</h3>
              {!canPay ? (
                <p className="mt-3 text-sm text-muted">You do not have permission to record payments.</p>
              ) : selected.outstandingPkr === 0 ? (
                <p className="mt-3 text-sm text-emerald-800">Fully paid. No balance outstanding.</p>
              ) : (
                <form action={recordPaymentAction} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={selected.id} />
                  <input type="hidden" name="return" value={returnTo} />
                  <label className="block text-sm text-muted">
                    Amount (PKR)
                    <input
                      name="amount_pkr"
                      type="number"
                      min={1}
                      max={selected.outstandingPkr}
                      step={1}
                      required
                      defaultValue={selected.nextAmountPkr || undefined}
                      className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-4 py-3 text-base text-ink outline-none focus:border-ink"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm text-muted">
                      Date received
                      <input name="paid_on" type="date" max={today} defaultValue={today} required className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-[15px] text-ink" />
                    </label>
                    <label className="block text-sm text-muted">
                      Method
                      <select name="method" required className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-3 py-3 text-[15px] text-ink">
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm text-muted">
                    Receipt or reference no.
                    <input name="reference_number" maxLength={80} placeholder="e.g. bank ref or cheque no." className="mt-1.5 w-full rounded-xl border border-line-strong bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-ink" />
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-dashed border-line-strong bg-white px-4 py-3 text-[15px] text-body hover:bg-mist">
                    <Icon name="upload" className="h-5 w-5" />
                    <span className="min-w-0 flex-1">Attach receipt (PDF or image)</span>
                    <input name="receipt_file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="w-28 text-xs file:hidden" />
                  </label>
                  <button type="submit" className="w-full rounded-full bg-ink py-3.5 text-base font-semibold text-paper hover:bg-body">
                    Save payment
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
