import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Notice } from "@/components/admin/Field";
import { uploadDocumentAction } from "@/lib/actions/admin";
import { deleteDocumentAction } from "@/lib/actions/lifecycle";
import { getDocumentRowsForAdmin, getUsers } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Documents" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminDocumentsPage({ searchParams }: Props) {
  const { can } = await requireStaff("documents", "add");
  const [sp, docs, users] = await Promise.all([searchParams, getDocumentRowsForAdmin(), getUsers()]);
  const buyers = users.filter((u) => u.role === "buyer");
  const canDelete = can("documents", "delete");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminNav active="/admin/documents" />
      <h1 className="text-2xl font-bold">Documents</h1>
      <Notice message={sp.saved === "1" ? "File uploaded." : sp.saved === "deleted" ? "Document deleted." : undefined} />
      <FormError code={sp.error} />

      <form action={uploadDocumentAction} encType="multipart/form-data" className="mt-6 space-y-4 rounded-xl border bg-white p-6 text-sm">
        <h2 className="text-base font-semibold">Upload a document</h2>
        <label className="block">
          Display name
          <input name="name" required className="mt-1 w-full rounded border px-2 py-1" />
        </label>
        <label className="block">
          Audience
          <select name="audience" className="mt-1 w-full rounded border px-2 py-1">
            <option value="public">Public</option>
            <option value="buyer">Buyer (private)</option>
          </select>
        </label>
        <label className="block">
          Buyer (if private)
          <select name="user_id" className="mt-1 w-full rounded border px-2 py-1">
            <option value="">—</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          File
          <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" className="mt-1 block w-full text-sm" />
        </label>
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-white">
          Upload
        </button>
      </form>

      <h2 className="mt-10 font-semibold">All documents</h2>
      {docs.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No documents available.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Who can see it</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">File</th>
                {canDelete && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-stone-100 align-top">
                  <td className="px-3 py-2">
                    {d.name}
                    {d.project && <span className="block text-xs text-stone-500">{d.project.name}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {d.audience === "public" ? (
                      "Everyone (public)"
                    ) : d.user ? (
                      <Link href={`/admin/customers/${d.user.id}`} className="text-teal-800 hover:underline">
                        {d.user.name} only
                      </Link>
                    ) : (
                      "Buyer only"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(d.issuedOn)}</td>
                  <td className="px-3 py-2">
                    {d.storagePath ? (
                      <Link href={`/api/documents/${d.id}/download`} className="text-teal-800 hover:underline">
                        Download
                      </Link>
                    ) : (
                      <span className="text-stone-400">No file</span>
                    )}
                  </td>
                  {canDelete && (
                    <td className="px-3 py-2 text-right">
                      <form action={deleteDocumentAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <ConfirmButton
                          className="px-3 py-1.5 text-xs"
                          message={`Delete "${d.name}"${d.user ? ` (${d.user.name}'s document)` : ""}? The file is removed and this cannot be undone.`}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
