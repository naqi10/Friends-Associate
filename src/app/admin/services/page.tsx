import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { FormError } from "@/components/FormError";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { Notice } from "@/components/admin/Field";
import { DIVISIONS } from "@/lib/catalog";
import { getAllServices } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Services" };

const SAVED: Record<string, string> = {
  created: "Service added.",
  updated: "Service saved.",
  deleted: "Service deleted.",
};

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminServicesPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, services] = await Promise.all([searchParams, getAllServices()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminNav active="/admin/content" />
      <h1 className="text-2xl font-bold">Website content</h1>
      <ContentTabs active="/admin/services" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">Services on the Architecture and Construction pages, and in the contact form&apos;s service list.</p>
        <Link href="/admin/services/new" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
          Add service
        </Link>
      </div>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      {DIVISIONS.map((d) => {
        const list = services.filter((s) => s.division === d.key);
        return (
          <section key={d.key} aria-labelledby={`div-${d.key}`} className="mt-8">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id={`div-${d.key}`} className="text-lg font-semibold">
                {d.label} page
              </h2>
              <Link href={d.path} target="_blank" className="text-xs text-teal-800 hover:underline">
                View page ↗
              </Link>
            </div>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No services on this page yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100 rounded-xl border bg-white">
                {list.map((s) => (
                  <li key={s.id} id={`s-${s.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {s.icon && (
                          <span aria-hidden className="mr-2">
                            {s.icon}
                          </span>
                        )}
                        {s.name}
                        {!s.published && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">Not published</span>}
                      </p>
                      <p className="text-xs text-stone-500">
                        Order {s.sortOrder} · {s.features.length} {s.features.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <Link href={`/admin/services/${s.id}`} className="text-sm font-medium text-teal-800 hover:underline">
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
