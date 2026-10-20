import Link from "next/link";
import { DeniedNotice } from "@/components/AdminNav";
import { Icon } from "@/components/admin/shell/icons";
import { BRAND } from "@/lib/brand";
import { PERIODS, getDashboard, type DueRow, type Period } from "@/lib/data";
import { formatDate, formatPkr, formatPkrShort } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permission-catalog";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<{ denied?: string; period?: string }> };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** "Fatima Siddiqui and Ahmed Malik", "A, B and 2 others". */
function names(list: string[]) {
  const unique = [...new Set(list)];
  if (unique.length <= 2) return unique.join(" and ");
  return `${unique.slice(0, 2).join(", ")} and ${unique.length - 2} other${unique.length - 2 === 1 ? "" : "s"}`;
}

function dueChip(days: number) {
  if (days < 0) return { text: `${-days} day${days === -1 ? "" : "s"} overdue`, cls: "bg-red-50 text-red-700" };
  if (days === 0) return { text: "Due today", cls: "bg-amber-50 text-amber-800" };
  if (days === 1) return { text: "Due tomorrow", cls: "bg-amber-50 text-amber-800" };
  return { text: `Due in ${days} days`, cls: "bg-mist text-body" };
}

const STAFF_SCOPE: Record<string, string> = {
  admin: "All sections",
  project_manager: "PM desk · Projects",
  sales: "Sales desk · Customers",
};

function greeting() {
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Karachi" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Avatar({ name, dark = false }: { name: string; dark?: boolean }) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${dark ? "bg-ink text-paper" : "bg-mist text-ink"}`}
    >
      {initials(name)}
    </span>
  );
}

function PaymentRow({ r }: { r: DueRow }) {
  const chip = dueChip(r.daysUntil);
  return (
    <tr className="border-t border-line">
      <td className="py-4 pr-3 pl-6">
        <Link href={`/admin/bookings/${r.bookingId}`} className="flex items-center gap-3 font-medium hover:underline">
          <Avatar name={r.customer} />
          {r.customer}
        </Link>
      </td>
      <td className="px-3 py-4 text-body">{r.unit}</td>
      <td className="px-4 py-4 whitespace-nowrap text-body">{formatDate(r.dueDate)}</td>
      <td className="px-4 py-4 text-right font-semibold whitespace-nowrap">{formatPkr(r.amountPkr)}</td>
      <td className="py-4 pr-6 pl-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${chip.cls}`}>{chip.text}</span>
      </td>
    </tr>
  );
}

export default async function AdminPage({ searchParams }: Props) {
  const { user } = await requireAdmin();
  const sp = await searchParams;
  const period = (PERIODS.some((p) => p.key === sp.period) ? sp.period : "month") as Period;
  const d = await getDashboard(period);
  const firstName = user.name.replace(/^FARYK\s+/i, "").split(/\s+/)[0] || user.name;
  const longDate = new Date(`${d.today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const shortDate = new Date(`${d.today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const unitTotal = d.units.available + d.units.booked + d.units.sold;
  const pct = (n: number) => (unitTotal ? (n / unitTotal) * 100 : 0);

  const quick = [
    { href: "/sales/leads/new", label: "Add lead", icon: "userPlus" },
    { href: "/admin/bookings", label: "Record payment", icon: "card" },
    { href: "/admin/properties/new", label: "List a property", icon: "building" },
    { href: "/admin/documents", label: "Upload document", icon: "upload" },
  ];
  const quickMobile = [
    { href: "/sales/leads/new", label: "Add lead", icon: "userPlus" },
    { href: "/admin/bookings/new", label: "New booking", icon: "plus" },
    { href: "/admin/properties/new", label: "Add property", icon: "building" },
    { href: "/admin/documents", label: "Upload doc", icon: "upload" },
  ];
  const modules = [
    { label: "Extra cities", help: "List properties beyond current locations", on: d.settings.extraCities },
    { label: "WhatsApp automation", help: "Auto reminders for instalments and leads", on: d.settings.whatsapp },
    { label: "Payment gateway", help: "Collect instalments online", on: d.settings.gateway },
  ];

  const banner =
    d.overdue.length > 0
      ? {
          strong: `${d.overdue.length} instalment${d.overdue.length === 1 ? "" : "s"} overdue`,
          rest: ` — ${formatPkr(d.overdueSum)} from ${names(d.overdue.map((o) => o.customer))}.${
            d.dueTomorrow.length ? ` ${names(d.dueTomorrow.map((o) => o.customer))} ${d.dueTomorrow.length === 1 ? "is" : "are"} due tomorrow.` : ""
          }`,
        }
      : null;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <DeniedNotice denied={sp.denied} />

      {/* Greeting + period */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted lg:text-base">
            <span className="lg:hidden">{shortDate}</span>
            <span className="hidden lg:inline">{longDate}</span>
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight lg:text-[44px]">
            {greeting()}, {firstName}
          </h1>
        </div>
        <nav aria-label="Period" className="hidden rounded-full bg-[#ebe9e4] p-1.5 lg:flex">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={p.key === "month" ? "/admin" : `/admin?period=${p.key}`}
              aria-current={p.key === period ? "page" : undefined}
              className={`rounded-full px-6 py-2.5 text-[15px] ${p.key === period ? "bg-white font-semibold text-ink shadow-sm" : "text-body hover:text-ink"}`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Overdue banner */}
      {banner && (
        <Link
          href="/admin/reminders"
          className="mt-6 flex items-center gap-3 rounded-[22px] border border-red-200 bg-red-50/70 px-5 py-4 text-red-900 lg:mt-8 lg:px-7 lg:py-5"
        >
          <Icon name="alert" className="h-5 w-5 shrink-0 text-red-700 lg:h-6 lg:w-6" />
          <p className="min-w-0 flex-1 text-[15px] lg:text-base">
            <strong className="font-semibold">{banner.strong}</strong>
            <span className="hidden lg:inline">{banner.rest}</span>
            <span className="lg:hidden"> · {formatPkr(d.overdueSum)}</span>
          </p>
          <span className="hidden font-semibold underline underline-offset-4 lg:inline">Send reminders</span>
          <Icon name="chevron" className="h-5 w-5 lg:hidden" />
        </Link>
      )}

      {/* KPI cards: desktop */}
      <div className="mt-8 hidden gap-5 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] bg-ink p-7 text-paper shadow-[0_18px_40px_-18px_rgb(14_14_14/0.5)]">
          <div className="flex items-center justify-between text-[15px] text-dim">
            Outstanding receivables <Icon name="card" />
          </div>
          <p className="mt-6 text-[clamp(28px,2.6vw,44px)] leading-none font-semibold tracking-tight whitespace-nowrap">{formatPkr(d.outstandingPkr)}</p>
          <div className="mt-6 flex flex-col items-start gap-2 text-sm">
            {d.overdueSum > 0 && <span className="rounded-full bg-red-900/60 px-3 py-1.5 text-red-100">{formatPkr(d.overdueSum).replace("PKR ", "")} overdue</span>}
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              {d.dueInPeriod} {d.period.phrase}
            </span>
          </div>
        </div>

        <div className="admin-card p-7">
          <div className="flex items-baseline justify-between text-[15px] text-muted">
            Unit inventory
            <Link href="/admin/properties" className="text-teal-800 underline underline-offset-4">
              Properties
            </Link>
          </div>
          <p className="mt-5 flex items-baseline gap-3">
            <span className="text-[40px] leading-none font-semibold 2xl:text-[44px]">{unitTotal}</span>
            <span className="text-muted">total units</span>
          </p>
          <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="bg-ink" style={{ width: `${pct(d.units.available)}%` }} />
            <span className="bg-teal-700" style={{ width: `${pct(d.units.booked)}%` }} />
            <span className="bg-faint" style={{ width: `${pct(d.units.sold)}%` }} />
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />{d.units.available} available</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-teal-700" />{d.units.booked} booked</li>
            <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-faint" />{d.units.sold} sold</li>
          </ul>
        </div>

        <div className="admin-card p-7">
          <div className="flex items-baseline justify-between text-[15px] text-muted">
            Sales pipeline
            <Link href="/sales" className="text-teal-800 underline underline-offset-4">
              Sales desk
            </Link>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            {[
              { n: d.pipeline.inquiries, l: "Web inquiries" },
              { n: d.pipeline.leads, l: "Leads" },
              { n: d.pipeline.customers, l: "Customers" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col-reverse justify-end">
                <dt className="mt-2 text-[15px] leading-snug text-muted">{s.l}</dt>
                <dd className="text-[40px] leading-none font-semibold 2xl:text-[44px]">{s.n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-dashed border-line pt-4 text-[15px] text-muted">Inquiry → Lead → Customer</p>
        </div>

        <div className="admin-card p-7">
          <div className="flex items-baseline justify-between text-[15px] text-muted">
            Projects
            <Link href="/pm" className="text-teal-800 underline underline-offset-4">
              PM desk
            </Link>
          </div>
          <p className="mt-5 flex items-baseline gap-3">
            <span className="text-[40px] leading-none font-semibold 2xl:text-[44px]">{d.projects.total}</span>
            <span className="text-muted">on record</span>
          </p>
          <p className="mt-6 text-[15px] text-body">{d.projects.divisions.join(" · ") || "No projects yet"}</p>
        </div>
      </div>

      {/* KPI cards: phone */}
      <div className="mt-6 space-y-3 lg:hidden">
        <div className="rounded-[26px] bg-ink p-6 text-paper">
          <p className="text-sm text-dim">Outstanding receivables</p>
          <p className="mt-2 text-[36px] leading-tight font-semibold">{formatPkr(d.outstandingPkr)}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {d.overdueSum > 0 && <span className="rounded-full bg-red-900/60 px-2.5 py-1 text-red-100">{formatPkr(d.overdueSum).replace("PKR ", "")} overdue</span>}
            <span className="rounded-full bg-white/10 px-2.5 py-1">
              {d.dueInPeriod} {d.period.phrase}
            </span>
          </div>
          <Link href="/admin/bookings" className="mt-5 block rounded-full bg-white py-3.5 text-center text-[15px] font-semibold text-ink">
            Record a payment
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { n: d.pipeline.customers, l: "Customers", href: "/admin/customers" },
            { n: d.projects.total, l: "Projects", href: "/admin/projects" },
            { n: d.pipeline.leads, l: "Leads", href: "/sales" },
            { n: d.pipeline.inquiries, l: "Web inquiries", href: "/sales" },
            { n: d.units.available, l: "Available units", href: "/admin/properties" },
            { n: d.units.booked, l: "Booked units", href: "/admin/properties" },
          ].map((s) => (
            <Link key={s.l} href={s.href} className="admin-card p-4">
              <p className="text-[28px] leading-none font-semibold">{s.n}</p>
              <p className="mt-2 text-sm text-muted">{s.l}</p>
            </Link>
          ))}
        </div>
        <div className="admin-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold">Unit inventory</p>
            <p className="text-sm text-muted">{unitTotal} units</p>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="bg-ink" style={{ width: `${pct(d.units.available)}%` }} />
            <span className="bg-teal-700" style={{ width: `${pct(d.units.booked)}%` }} />
            <span className="bg-faint" style={{ width: `${pct(d.units.sold)}%` }} />
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-body">
            <span>■ {d.units.available} available</span>
            <span className="text-teal-700">■ <span className="text-body">{d.units.booked} booked</span></span>
            <span className="text-faint">■ <span className="text-body">{d.units.sold} sold</span></span>
          </p>
        </div>
      </div>

      {/* Upcoming payments + quick actions */}
      <div className="mt-6 grid gap-5 lg:mt-8 min-[1400px]:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-labelledby="upcoming" className="admin-card overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 lg:px-7 lg:pt-7">
            <div>
              <h2 id="upcoming" className="text-lg font-semibold lg:text-[22px]">
                Upcoming payments
              </h2>
              <p className="mt-1 hidden text-[15px] text-muted lg:block">
                {formatPkr(d.upcomingSum)} across {d.upcoming.length} instalment{d.upcoming.length === 1 ? "" : "s"}
              </p>
            </div>
            <Link href="/admin/bookings" className="text-sm font-medium text-teal-800 underline underline-offset-4 lg:text-[15px]">
              <span className="lg:hidden">See all</span>
              <span className="hidden lg:inline">All bookings →</span>
            </Link>
          </div>
          {d.upcoming.length === 0 ? (
            <p className="px-7 py-10 text-sm text-muted">No payments overdue or {d.period.phrase}.</p>
          ) : (
            <>
              <div className="mt-6 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[560px] text-left text-[15px]">
                  <thead className="bg-paper/60 text-muted">
                    <tr className="bg-[#faf9f7]">
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 font-medium">Due date</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.upcoming.map((r) => (
                      <PaymentRow key={r.bookingId} r={r} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 divide-y divide-line lg:hidden">
                {d.upcoming.map((r) => {
                  const chip = dueChip(r.daysUntil);
                  return (
                    <li key={r.bookingId}>
                      <Link href={`/admin/bookings/${r.bookingId}`} className="flex gap-3 px-5 py-4">
                        <Avatar name={r.customer} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-semibold">{r.customer}</p>
                            <p className="shrink-0 font-semibold">{formatPkrShort(r.amountPkr)}</p>
                          </div>
                          <p className="truncate text-sm text-body">{r.unit}</p>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <p className="text-sm text-muted">{formatDate(r.dueDate)}</p>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip.cls}`}>{chip.text}</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="quick" className="lg:admin-card lg:p-7">
          <h2 id="quick" className="text-lg font-semibold lg:text-[22px]">
            Quick actions
          </h2>
          <div className="mt-5 hidden grid-cols-4 gap-4 lg:grid min-[1400px]:grid-cols-2">
            {quick.map((q) => (
              <Link key={q.label} href={q.href} className="flex min-h-[112px] flex-col justify-between rounded-[20px] border border-line p-4 2xl:p-5 transition hover:border-ink hover:bg-paper">
                <Icon name={q.icon} className="h-6 w-6" />
                <span className="text-[15px] font-medium">{q.label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 lg:hidden">
            {quickMobile.map((q) => (
              <Link key={q.label} href={q.href} className="flex flex-col items-center gap-2 text-center text-xs">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white">
                  <Icon name={q.icon} />
                </span>
                {q.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Staff + phase 2 */}
      <div className="mt-6 grid gap-5 lg:mt-8 xl:grid-cols-2">
        <section aria-labelledby="staff" className="admin-card p-5 lg:p-7">
          <div className="flex items-baseline justify-between">
            <h2 id="staff" className="text-lg font-semibold lg:text-[22px]">
              <span className="lg:hidden">Staff</span>
              <span className="hidden lg:inline">Staff &amp; roles</span>
            </h2>
            <Link href="/admin/permissions" className="text-sm font-medium text-teal-800 underline underline-offset-4 lg:text-[15px]">
              <span className="lg:hidden">Manage</span>
              <span className="hidden lg:inline">Permissions →</span>
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {d.staff.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-4">
                <Avatar name={s.name} dark />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/staff/${s.id}`} className="block truncate font-medium hover:underline lg:text-[17px]">
                    {s.name}
                  </Link>
                  <p className="hidden truncate text-sm text-muted lg:block">{STAFF_SCOPE[s.role] ?? ""}</p>
                </div>
                <span className="rounded-full border border-line-strong px-3 py-1 text-xs lg:text-sm">
                  {s.role === "project_manager" ? (
                    <>
                      <span className="lg:hidden">PM</span>
                      <span className="hidden lg:inline">Project manager</span>
                    </>
                  ) : (
                    ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] ?? s.role
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="phase2" className="rounded-[28px] border-2 border-dashed border-line-strong bg-white/60 p-5 lg:border-solid lg:admin-card lg:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="phase2" className="text-lg font-semibold lg:text-[22px]">
              Phase 2 modules
            </h2>
            <span className="rounded-full bg-mist px-3 py-1 text-xs text-body lg:text-sm">
              <span className="lg:hidden">Inactive</span>
              <span className="hidden lg:inline">Not activated</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-muted lg:hidden">{modules.map((m) => m.label).join(" · ")}</p>
          <ul className="mt-4 hidden divide-y divide-line border-t border-line lg:block">
            {modules.map((m) => (
              <li key={m.label} className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px]">{m.label}</p>
                  <p className="text-sm text-muted">{m.help}</p>
                </div>
                <span className="text-sm text-muted">{m.on ? "On" : "Off"}</span>
                <span aria-hidden className={`h-7 w-7 rounded-lg border ${m.on ? "border-ink bg-ink" : "border-line-strong bg-white"}`} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted lg:mt-4">Public WhatsApp link uses {BRAND.phoneIntl} regardless.</p>
        </section>
      </div>
    </div>
  );
}
