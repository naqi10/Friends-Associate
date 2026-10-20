import Link from "next/link";
import { ImportForm } from "@/components/admin/ImportForm";
import { importPropertiesAction } from "@/lib/actions/inventory";
import { PROPERTY_TYPES } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import { requireStaff } from "@/lib/permissions";

export const metadata = { title: "Import listings" };

export default async function ImportPropertiesPage() {
  await requireStaff("properties", "add");
  const rows: [string, string][] = [
    ["title", "Listing name, e.g. 5 Marla House, Model Town (required)"],
    ["type", `${PROPERTY_TYPES.join(", ")} (required)`],
    ["listing", "sale or rent (required)"],
    ["city", `${CITIES.join(", ")} (required)`],
    ["locality", "Area, e.g. Model Town"],
    ["size", "e.g. 5 Marla, 1 Kanal, 220 sq ft"],
    ["price_pkr", "Whole rupees. For rent: the monthly rent (required)"],
    ["status", "Available or Sold (default Available)"],
    ["project_slug", "Leave empty for an independent listing, or a project's slug"],
    ["description", "Optional"],
    ["published", "yes to show on the website now; otherwise hidden"],
  ];
  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href="/admin/properties" className="text-sm text-muted hover:underline">
        ← Properties
      </Link>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight lg:text-[40px]">Import listings from CSV</h1>
      <p className="mt-1 max-w-3xl text-[15px] text-muted">
        Every row is checked before anything is saved. If one row has a problem, nothing is imported and you get a list of lines to fix.
      </p>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <ImportForm action={importPropertiesAction} />
        <aside className="admin-card p-7">
          <h2 className="text-lg font-semibold">Columns</h2>
          <a href="/api/templates/properties" className="mt-3 inline-block rounded-full border-[1.5px] border-line-strong px-5 py-2.5 text-sm font-semibold hover:bg-mist">
            Download template
          </a>
          <dl className="mt-5 space-y-3 text-sm">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono font-semibold">{k}</dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
