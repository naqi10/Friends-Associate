import { Field, SelectField } from "@/components/admin/Field";
import { ImageField } from "@/components/admin/ImageField";
import { savePropertyAction } from "@/lib/actions/admin";
import { LISTING_TYPES, PROPERTY_TYPES } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import type { Property } from "@/lib/types";

/** Shared add/edit form for listings (project units and standalone sale/rent listings). */
export function PropertyForm({ property, projects }: { property?: Property; projects: { id: string; name: string }[] }) {
  const p = property;
  return (
    <form action={savePropertyAction} className="mt-6 grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-2">
        <Field label="Title" name="title" defaultValue={p?.title} required maxLength={150} placeholder="10 Marla House, Model Town" />
      </div>
      <SelectField
        label="Listing"
        name="listing_type"
        required
        defaultValue={p?.listing_type ?? "sale"}
        options={LISTING_TYPES.map((l) => ({ value: l.key, label: l.label }))}
      />
      <SelectField
        label="Project"
        name="project_id"
        defaultValue={p?.project_id ?? ""}
        options={[{ value: "", label: "— Standalone listing (not in a project) —" }, ...projects.map((x) => ({ value: x.id, label: x.name }))]}
      />
      <SelectField label="Property type" name="type" defaultValue={p?.type ?? "House"} options={PROPERTY_TYPES} />
      <SelectField label="Status" name="status" defaultValue={p?.status ?? "Available"} options={["Available", "Booked", "Sold"]} />
      <SelectField label="City" name="city" options={CITIES} defaultValue={p?.city ?? "Rahim Yar Khan"} />
      <Field label="Locality" name="locality" defaultValue={p?.locality} placeholder="Model Town" />
      <Field label="Size" name="size" defaultValue={p?.size} placeholder="10 Marla, 1 Kanal or 1,200 sq ft" />
      <Field
        label="Size in Marla"
        name="area_marla"
        type="number"
        min={0}
        step="0.5"
        defaultValue={p?.area_marla ?? undefined}
        hint="Leave blank to work it out from Size (1 Kanal = 20 Marla). Used by the size filter."
      />
      <Field
        label="Price (PKR)"
        name="price_pkr"
        type="number"
        min={0}
        step={1}
        required
        defaultValue={p?.price_pkr}
        hint="For rent listings, enter the monthly rent."
      />
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-stone-700">Description</span>
        <textarea name="description" rows={3} defaultValue={p?.description} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
      </label>
      <div className="sm:col-span-2">
        <ImageField current={p?.image_path} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="published" defaultChecked={p?.published ?? true} className="h-4 w-4" />
        Published on the website
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
          {p ? "Save changes" : "Create listing"}
        </button>
      </div>
    </form>
  );
}
