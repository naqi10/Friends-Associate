import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { formatDate } from "@/lib/format";
import { getCompany, getDocumentsForUser } from "@/lib/data";
import { requireUser } from "@/lib/require-user";
import { permissionsFor } from "@/lib/permissions";

export default async function PortalDocumentsPage() {
  const user = await requireUser(["buyer"]);
  const can = await permissionsFor(user);
  if (!can("documents", "view")) {
    return (
      <PortalShell title="My documents">
      <p className="rounded-md bg-stone-100 p-4 text-sm text-stone-700">
        This section is not available for your account. Please contact Friends Associates if you need access.
      </p>
      </PortalShell>
    );
  }
  const docs = await getDocumentsForUser(user.id);
  const canDownload = !!user.document_download_paid_at;
  const company = await getCompany();
  const fee = company.document_download_fee_pkr;

  return (
    <PortalShell title="My documents">
      {!canDownload && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Paid feature. It needs a payment of {fee / 1000}K once. Admin will unlock downloads after fee is recorded.
        </p>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-stone-500">
            <th className="py-2">Document</th>
            <th className="py-2">Date</th>
            <th className="py-2">Status</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-stone-100">
              <td className="py-2">{d.name}</td>
              <td className="py-2">{formatDate(d.issued_on)}</td>
              <td className="py-2">{d.status}</td>
              <td className="py-2">
                {canDownload && d.storage_path ? (
                  <Link href={`/api/documents/${d.id}/download`} className="text-teal-800 hover:underline">
                    Download
                  </Link>
                ) : canDownload ? (
                  "No file yet"
                ) : (
                  "Locked"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PortalShell>
  );
}
