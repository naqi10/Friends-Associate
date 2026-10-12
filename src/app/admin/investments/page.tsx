import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { Notice } from "@/components/admin/Field";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES, labelOf } from "@/lib/catalog";
import { getInvestmentRows } from "@/lib/data";
import { formatPkr } from "@/lib/format";
import { requireStaffAny } from "@/lib/permissions";

export const metadata = { title: "Investments" };

type Props = { searchParams: Promise<{ saved?: string }> };

export default async function AdminInvestmentsPage({ searchParams }: Props) {
  const { can } = await requireStaffAny([
    ["projects", "update"],
    ["projects", "add"],
  ]);
  const [sp, rows] = await Promise.all([searchParams, getInvestmentRows()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav active="/admin/investments" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Investment opportunities</h1>
          <p className="text-sm text-stone-600">Shown on /investment. Investor interest arrives as leads on the Sales desk.</p>
        </div>
        {can("projects", "add") && (
          <Link href="/admin/investments/new" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
            Add opportunity
          </Link>
        )}
      </div>
      <Notice message={sp.saved ? "Saved." : undefined} />
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Minimum</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Interested</th>
              <th className="px-3 py-2">Website</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-3 py-2 font-medium">{r.title}</td>
                <td className="px-3 py-2">{labelOf(INVESTMENT_TYPES, r.investmentType)}</td>
                <td className="px-3 py-2">{formatPkr(r.minimumInvestmentPkr)}</td>
                <td className="px-3 py-2">{labelOf(INVESTMENT_STATUSES, r.status)}</td>
                <td className="px-3 py-2">{r._count.leads}</td>
                <td className="px-3 py-2">{r.published ? "Published" : "Hidden"}</td>
                <td className="px-3 py-2 text-right">
                  {can("projects", "update") && (
                    <Link href={`/admin/investments/${r.id}`} className="text-teal-800 hover:underline">
                      Edit
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
