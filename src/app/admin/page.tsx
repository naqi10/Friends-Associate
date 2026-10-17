import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { AdminNav, DeniedNotice } from "@/components/AdminNav";
import { getAdminCounts, getBookingRows, getCompany, getSiteSettings, getUsers } from "@/lib/data";
import { formatDate, formatPkr } from "@/lib/format";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  await requireAdmin();
  const { denied } = await searchParams;
  const [counts, bookings, users, settings, company] = await Promise.all([
    getAdminCounts(),
    getBookingRows(),
    getUsers(),
    getSiteSettings(),
    getCompany(),
  ]);
  const staff = users.filter((u) => u.role !== "buyer");
  const upcoming = bookings.filter((b) => b.outstandingPkr > 0 && b.status !== "Cancelled").slice(0, 5);

  const cards = [
    { label: "Customers", value: counts.customers, href: "/admin/customers" },
    { label: "Projects", value: counts.projects, href: "/admin/projects" },
    { label: "Available units", value: counts.available, href: "/admin/properties" },
    { label: "Booked units", value: counts.booked, href: "/admin/properties" },
    { label: "Sold units", value: counts.sold, href: "/admin/properties" },
    { label: "Web inquiries", value: counts.inquiries, href: "/sales" },
    { label: "Leads", value: counts.leads, href: "/sales" },
    { label: "Outstanding", value: formatPkr(counts.outstandingPkr), href: "/admin/bookings" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin command panel</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-stone-600 hover:text-stone-900">
            Logout
          </button>
        </form>
      </div>
      <AdminNav active="/admin" />
      <DeniedNotice denied={denied} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-xl border bg-white p-4 transition hover:border-teal-400">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-stone-600">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Upcoming payments</h2>
          <Link href="/admin/bookings" className="text-sm text-teal-800 hover:underline">
            All bookings →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No payments due.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/admin/bookings/${b.id}`} className="hover:underline">
                  {b.buyerName} — {b.propertyTitle}
                </Link>
                <span className="text-stone-600">
                  {formatDate(b.nextPaymentDate)} · {formatPkr(b.nextPaymentAmountPkr)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Staff accounts</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {staff.map((u) => (
              <li key={u.id} className="flex justify-between gap-2">
                <span>{u.name}</span>
                <span className="text-stone-500">{u.role.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Phase 2 options (inactive)</h2>
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            <li>Extra cities: {settings.extra_cities_enabled ? "On" : "Off"}</li>
            <li>WhatsApp automation: {settings.whatsapp_automation_enabled ? "On" : "Off"}</li>
            <li>Payment gateway: {settings.payment_gateway_enabled ? "On" : "Off"}</li>
          </ul>
          <p className="mt-2 text-xs text-stone-500">Public WhatsApp link uses {company.whatsapp} regardless.</p>
        </section>
      </div>
    </div>
  );
}
