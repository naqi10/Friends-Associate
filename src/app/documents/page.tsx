import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { getPublicDocuments } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";

export const metadata: Metadata = pageMetadata({
  title: "Documents",
  description: "Public brochures and company documents from Friends Associates.",
  path: "/documents",
});

export default async function DocumentsPage() {
  const can = await permissionsFor(await getSessionUser());
  if (!can("documents", "view")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Public documents</h1>
        <p className="mt-4 text-stone-600">Documents are not available at the moment. Please contact Friends Associates sales.</p>
      </div>
    );
  }
  const docs = await getPublicDocuments();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Public documents</h1>
      <p className="mt-2 text-sm text-stone-600">Buyer-specific files are available after login in the portal.</p>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-stone-500">
            <th className="py-2">Document</th>
            <th className="py-2">Date</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-stone-100">
              <td className="py-3">{d.name}</td>
              <td className="py-3">{formatDate(d.issued_on)}</td>
              <td className="py-3">
                {d.storage_path ? (
                  <Link href={`/api/documents/${d.id}/download`} className="text-teal-800 hover:underline">
                    Download
                  </Link>
                ) : (
                  <span className="text-stone-400">Upload via admin</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
