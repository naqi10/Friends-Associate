import Link from "next/link";
import type { Metadata } from "next";
import { AdminNav, DeniedNotice } from "@/components/AdminNav";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { logoutAction } from "@/lib/actions/auth";
import { LEAD_STATUSES } from "@/lib/catalog";
import { getDueFollowUps, getLeadRows, getLeadStatusCounts } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Sales desk", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function SalesDeskPage({ searchParams }: Props) {
  const { can } = await requireStaff("leads", "view");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const [{ denied }, rows, counts, due] = await Promise.all([searchParams, getLeadRows(), getLeadStatusCounts(), getDueFollowUps(today)]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales desk</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-stone-600">
            Logout
          </button>
        </form>
      </div>
      <div className="mt-6">
        <AdminNav active="/sales" />
        <DeniedNotice denied={denied} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Leads</h2>
          <p className="text-sm text-stone-600">Every enquiry from the website — contact, callbacks, sell requests and investors — lands here.</p>
        </div>
        {can("leads", "add") && (
          <Link href="/sales/leads/new" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
            Add lead
          </Link>
        )}
      </div>

      {due > 0 && (
        <p role="status" className="mt-4 rounded-md bg-orange-50 p-3 text-sm text-orange-900">
          {due} follow-up{due === 1 ? " is" : "s are"} due today or overdue.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {LEAD_STATUSES.map((s) => (
          <div key={s.key} className="rounded-lg border bg-white p-3">
            <dt className="text-xs text-stone-500">{s.label}</dt>
            <dd className="text-xl font-semibold">{counts[s.key] ?? 0}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <LeadsTable rows={rows} />
      </div>
    </div>
  );
}
