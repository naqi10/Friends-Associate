import { getRecentAuditLogs } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  await requireAdmin();
  const logs = await getRecentAuditLogs(100);

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="mt-1 text-sm text-stone-600">The latest 100 sensitive changes. Passwords and tokens are never recorded.</p>
      {logs.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">No changes recorded yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto admin-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Who</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-stone-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2">{l.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}</td>
                  <td className="px-3 py-2">{l.user?.name ?? "Deleted user"}</td>
                  <td className="px-3 py-2">{l.module}</td>
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="max-w-40 truncate px-3 py-2 font-mono text-xs text-stone-500" title={l.recordId ?? undefined}>
                    {l.recordId ?? "—"}
                  </td>
                  <td className="max-w-md px-3 py-2">
                    {(l.newValue || l.oldValue) && (
                      <details>
                        <summary className="cursor-pointer text-teal-800">View details</summary>
                        {l.oldValue && <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-stone-500">Before: {l.oldValue}</pre>}
                        {l.newValue && <pre className="mt-2 whitespace-pre-wrap break-all text-xs">After: {l.newValue}</pre>}
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
