import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { Notice } from "@/components/admin/Field";
import { LifecyclePanel } from "@/components/admin/LifecyclePanel";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { deletePropertyAction } from "@/lib/actions/lifecycle";
import { getProjectById, getProjects, getPropertyById, propertyBlockers } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";
import { propertyPath } from "@/lib/property-slug";

export const metadata = { title: "Edit listing" };

const SAVED: Record<string, string> = {
  archived: "Listing archived. It is hidden from the website.",
  restored: "Listing restored. It is unpublished: tick Published and save when it is ready to go live.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> };

export default async function EditPropertyPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("properties", "update");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [prop, active, blockers] = await Promise.all([getPropertyById(id), getProjects(), propertyBlockers(id)]);
  if (!prop || !blockers) notFound();
  // Keep the unit's own project selectable even if that project is archived, so saving never moves it.
  const own = prop.project_id && !active.some((p) => p.id === prop.project_id) ? await getProjectById(prop.project_id) : null;
  const projects = own ? [...active, { ...own, name: `${own.name} (archived)` }] : active;

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href={prop.archived_at ? "/admin/properties?archived=1" : "/admin/properties"} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
        ← {prop.archived_at ? "Archived listings" : "All listings"}
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">
          Edit listing
          {prop.archived_at && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 align-middle text-xs font-medium text-stone-700">Archived</span>}
        </h1>
        {prop.published && (
          <Link href={propertyPath(prop)} className="text-sm text-teal-800 hover:underline" target="_blank">
            View on site ↗
          </Link>
        )}
      </div>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />
      <PropertyForm property={prop} projects={projects} />
      {blockers.activeBooking && (
        <p className="mt-6 text-sm">
          <Link href={`/admin/bookings/${blockers.activeBooking}`} className="text-teal-800 hover:underline">
            Open this unit&apos;s booking →
          </Link>
        </p>
      )}
      <LifecyclePanel
        kind="property"
        id={prop.id}
        name={prop.title}
        what="listing"
        archivedAt={prop.archived_at}
        canArchive={can("properties", "update")}
        canDelete={can("properties", "delete")}
        deleteAction={deletePropertyAction}
        archiveBlockedReason={
          blockers.status === "Booked" && blockers.activeBooking
            ? "This unit has a booking in progress, so it cannot be archived. Cancel the booking first, or archive it once it is Sold."
            : undefined
        }
        blockers={[{ label: "bookings (including cancelled ones kept as history)", count: blockers.bookings }]}
      />
    </div>
  );
}
