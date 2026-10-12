import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { uploadDocumentAction } from "@/lib/actions/admin";
import { getPublicDocuments, getUsers } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminDocumentsPage({ searchParams }: Props) {
  await requireStaff("documents", "add");
  const sp = await searchParams;
  const docs = await getPublicDocuments();
  const buyers = (await getUsers()).filter((u) => u.role === "buyer");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/documents" />
      <h1 className="text-2xl font-bold">Documents</h1>
      {sp.saved === "1" && <p className="mt-2 text-sm text-teal-800">File uploaded.</p>}
      <FormError code={sp.error} />

      <form action={uploadDocumentAction} encType="multipart/form-data" className="mt-6 space-y-4 rounded-xl border bg-white p-6 text-sm">
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

      <h2 className="mt-10 font-semibold">Recent public documents</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {docs.map((d) => (
          <li key={d.id} className="flex justify-between rounded border p-2">
            <span>{d.name}</span>
            {d.storage_path ? (
              <Link href={`/api/documents/${d.id}/download`} className="text-teal-800">
                Download
              </Link>
            ) : (
              <span className="text-stone-400">No file</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
