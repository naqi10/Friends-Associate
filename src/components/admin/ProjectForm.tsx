import { Field, SelectField } from "@/components/admin/Field";
import { ImageField } from "@/components/admin/ImageField";
import { saveProjectAction } from "@/lib/actions/admin";
import { DIVISIONS, PROJECT_CATEGORIES } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";
import type { Project } from "@/lib/types";

/** Shared add/edit form for projects. */
export function ProjectForm({ project }: { project?: Project }) {
  const p = project;
  return (
    <form action={saveProjectAction} className="mt-6 grid gap-4 admin-card p-6 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-2">
        <Field label="Project name" name="name" defaultValue={p?.name} required maxLength={150} />
      </div>
      <Field
        label="URL slug"
        name="slug"
        defaultValue={p?.slug}
        required
        placeholder="petrol-pump-khanpur-road"
        hint="Lowercase words joined by hyphens. Changing it changes the public link."
      />
      <SelectField label="City" name="city" options={CITIES} defaultValue={p?.city ?? "Rahim Yar Khan"} />
      <SelectField
        label="Division"
        name="division"
        required
        defaultValue={p?.division ?? "construction"}
        options={DIVISIONS.map((d) => ({ value: d.key, label: d.label }))}
      />
      <SelectField
        label="Category"
        name="category"
        required
        defaultValue={p?.category ?? "residential"}
        options={PROJECT_CATEGORIES.map((c) => ({ value: c.key, label: `${c.label} — ${c.examples}` }))}
      />
      <Field label="Location / area" name="location" defaultValue={p?.location} />
      <SelectField label="Type" name="type" defaultValue={p?.type ?? "Residential"} options={["Residential", "Commercial", "Mixed-use"]} />
      <Field label="Status" name="status" defaultValue={p?.status ?? "Planning"} hint="e.g. Planning, Under construction, Completed" />
      <Field label="Overall progress %" name="progress_percent" type="number" min={0} max={100} defaultValue={p?.progress_percent ?? 0} />
      <Field label="Expected completion" name="expected_completion" defaultValue={p?.expected_completion ?? "TBC"} />
      <Field label="Available units" name="available_units" type="number" min={0} defaultValue={p?.available_units ?? 0} />
      <Field label="Contact person" name="contact_person" defaultValue={p?.contact_person ?? "Friends Associates"} />
      <Field label="Contact phone" name="contact_phone" defaultValue={p?.contact_phone ?? "0312-6711828"} />
      <Field label="Pricing label" name="pricing_label" defaultValue={p?.pricing_label} hint="Optional, e.g. PKR 95 lakh – 3.2 crore" />
      <Field label="Payment plan" name="payment_plan" defaultValue={p?.payment_plan} />
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-stone-700">Description</span>
        <textarea name="description" rows={4} defaultValue={p?.description} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
      </label>
      <div className="sm:col-span-2">
        <ImageField current={p?.image_path} label="Cover photo" />
      </div>
      <Field label="SEO title" name="seo_title" defaultValue={p?.seo_title} maxLength={70} hint="Optional. Shown in Google results." />
      <Field label="SEO description" name="seo_description" defaultValue={p?.seo_description} maxLength={170} />
      <div className="flex flex-wrap gap-6 text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={p?.published ?? true} className="h-4 w-4" />
          Published on the website
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="h-4 w-4" />
          Feature on the home page
        </label>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
          {p ? "Save changes" : "Create project"}
        </button>
      </div>
    </form>
  );
}
