import { PRODUCT_CATEGORIES } from "@/lib/catalog";
import { saveProductAction } from "@/lib/actions/products";
import { formatOptions, type ProductRow } from "@/lib/data";
import { CheckboxField, Field, SelectField, TextAreaField } from "./Field";
import { ImageField } from "./ImageField";

/** Add / edit form for one product (Admin → Products). */
export function ProductForm({ product }: { product?: ProductRow }) {
  return (
    <form action={saveProductAction} className="mt-6 space-y-4 admin-card p-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Product name" name="name" defaultValue={product?.name} maxLength={120} required hint="e.g. DPC Membrane – Rock Grip" />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Category"
          name="category"
          options={PRODUCT_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
          defaultValue={product?.category ?? "waterproofing"}
          required
        />
        <Field label="Brand" name="brand" defaultValue={product?.brand} maxLength={80} hint="Optional, e.g. Brick Stone" />
        <Field label="Display order" name="sort_order" type="number" min={0} max={999} defaultValue={product?.sortOrder ?? 0} hint="Lower numbers show first." />
      </div>
      <TextAreaField label="What it is used for" name="summary" defaultValue={product?.summary} maxLength={400} rows={2} hint="One or two sentences, shown on the product card." />
      <TextAreaField
        label="Prices"
        name="options"
        defaultValue={product ? formatOptions(product.options) : ""}
        rows={4}
        hint="One line per size or pack: size | price in rupees | unit. Examples: “9 inch | 3800 | per roll”, “ | 16 | per piece” (no size). Leave empty to show “Call for price”."
      />
      <Field label="Price note (optional)" name="note" defaultValue={product?.note} maxLength={300} hint="Small print under the prices, e.g. “Prices are without bilty (transport not included).”" />
      <div className="grid gap-4 lg:grid-cols-2">
        <TextAreaField label="Benefits" name="benefits" defaultValue={product?.benefits.join("\n")} rows={6} hint="One per line, up to 15." />
        <TextAreaField label="Technical data" name="specs" defaultValue={product?.specs.join("\n")} rows={6} hint="One per line, e.g. “Coverage: 50–60 sq ft per kit”." />
      </div>
      <ImageField current={product?.imagePath} label="Product photo (optional)" removeName="remove_image" shape="square" />
      <CheckboxField label="Published (shown on the website)" name="published" defaultChecked={product ? product.published : true} />
      <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
        {product ? "Save product" : "Add product"}
      </button>
    </form>
  );
}
