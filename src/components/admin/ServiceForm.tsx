import { DIVISIONS } from "@/lib/catalog";
import { saveServiceAction } from "@/lib/actions/services";
import type { ServiceRow } from "@/lib/data";
import { hasRealImage } from "@/lib/media";
import { CheckboxField, Field, SelectField, TextAreaField } from "./Field";
import { ImageField } from "./ImageField";

/** Add / edit form for one service (PROJECT_SPEC §15). */
export function ServiceForm({ service }: { service?: ServiceRow }) {
  return (
    <form action={saveServiceAction} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
        <Field label="Service name" name="name" defaultValue={service?.name} maxLength={80} required />
        <Field label="Icon" name="icon" defaultValue={service?.icon} maxLength={8} hint="One emoji, optional" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Shown on"
          name="division"
          options={DIVISIONS.map((d) => ({ value: d.key, label: `${d.label} page` }))}
          defaultValue={service?.division ?? "architecture"}
          required
        />
        <Field label="Display order" name="sort_order" type="number" min={0} max={999} defaultValue={service?.sortOrder ?? 0} hint="Lower numbers show first." />
      </div>
      <TextAreaField label="Short description" name="short_description" defaultValue={service?.shortDescription} maxLength={300} rows={2} />
      <TextAreaField
        label="What is included"
        name="features"
        defaultValue={service?.features.join("\n")}
        rows={6}
        hint="One item per line, up to 15. Shown as a bullet list."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starting price" name="starting_price" defaultValue={service?.startingPrice} maxLength={60} hint="Optional, e.g. From PKR 25 per sq ft" />
        <Field label="Estimated duration" name="estimated_duration" defaultValue={service?.estimatedDuration} maxLength={60} hint="Optional, e.g. 2–3 weeks" />
        <Field label="Button text" name="cta_text" defaultValue={service?.ctaText} maxLength={40} hint="Optional, e.g. Get a quotation" />
        <Field label="Button link" name="cta_url" defaultValue={service?.ctaUrl} maxLength={300} hint="e.g. /contact#enquiry" />
      </div>
      <ImageField current={service?.imagePath} label="Photo (optional)" />
      {service && hasRealImage(service.imagePath) && <CheckboxField label="Remove the current photo" name="remove_image" />}
      <CheckboxField label="Published (shown on the website)" name="published" defaultChecked={service ? service.published : true} />
      <button type="submit" className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900">
        {service ? "Save service" : "Add service"}
      </button>
    </form>
  );
}
