import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { formatPkr } from "@/lib/format";
import { getProperties, getProjects } from "@/lib/data";
import { requireStaffAny } from "@/lib/permissions";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminPropertiesPage({ searchParams }: Props) {
  const { can } = await requireStaffAny([
    ["properties", "update"],
    ["properties", "add"],
  ]);
  const sp = await searchParams;
  const properties = await getProperties();
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminNav active="/admin/properties" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Properties</h1>
        {can("properties", "add") && (
          <Link href="/admin/properties/new" className="rounded-md bg-teal-800 px-3 py-2 text-sm text-white">
            Add listing
          </Link>
        )}
      </div>
      {sp.saved === "1" && <p className="mt-3 text-sm text-teal-800">Saved.</p>}
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-stone-500">
            <th className="py-2">Title</th>
            <th className="py-2">Listing</th>
            <th className="py-2">Locality</th>
            <th className="py-2">Project</th>
            <th className="py-2">Price</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => {
            const proj = projects.find((x) => x.id === p.project_id);
            return (
              <tr key={p.id} className="border-b">
                <td className="py-2">
                  {p.title}
                  {!p.published && <span className="ml-2 rounded bg-stone-200 px-1.5 text-xs">Hidden</span>}
                </td>
                <td className="py-2">{p.listing_type === "rent" ? "Rent" : "Sale"}</td>
                <td className="py-2">{p.locality}</td>
                <td className="py-2">{proj?.name ?? "—"}</td>
                <td className="py-2">{formatPkr(p.price_pkr)}</td>
                <td className="py-2">{p.status}</td>
                <td className="py-2">
                  {can("properties", "update") && (
                    <Link href={`/admin/properties/${p.id}`} className="text-teal-800">
                      Edit
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
