import { Field, SelectField } from "@/components/admin/Field";
import { ImageField } from "@/components/admin/ImageField";
import { saveInvestmentAction } from "@/lib/actions/investments";
import { INVESTMENT_STATUSES, INVESTMENT_TYPES } from "@/lib/catalog";
import { CITIES } from "@/lib/constants";

type Investment = {
  id: string;
  slug: string;
  title: string;
  projectId: string | null;
  investmentType: string;
  city: string;
  location: string;
  summary: string;
  description: string;
  minimumInvestmentPkr: number;
  targetAmountPkr: number | null;
  expectedDuration: string;
  paymentStructure: string;
  returnsNote: string;
  figuresReviewedOn: string | null;
  status: string;
  published: boolean;
  sortOrder: number;
  imagePath: string;
};

export function InvestmentForm({ inv, projects }: { inv?: Investment; projects: { id: string; name: string }[] }) {
  return (
    <form action={saveInvestmentAction} className="mt-6 grid gap-4 admin-card p-6 sm:grid-cols-2">
      {inv && <input type="hidden" name="id" value={inv.id} />}
      <div className="sm:col-span-2">
        <Field label="Title" name="title" defaultValue={inv?.title} required maxLength={150} />
      </div>
      <Field label="URL slug" name="slug" defaultValue={inv?.slug} required placeholder="shahi-road-commercial-plaza" />
      <SelectField
        label="Type"
        name="investment_type"
        defaultValue={inv?.investmentType ?? "plaza"}
        options={INVESTMENT_TYPES.map((t) => ({ value: t.key, label: t.label }))}
      />
      <SelectField label="City" name="city" options={CITIES} defaultValue={inv?.city ?? "Rahim Yar Khan"} />
      <Field label="Location" name="location" defaultValue={inv?.location} />
      <SelectField
        label="Linked project (optional)"
        name="project_id"
        defaultValue={inv?.projectId ?? ""}
        options={[{ value: "", label: "— None —" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
      />
      <SelectField
        label="Status"
        name="status"
        defaultValue={inv?.status ?? "open"}
        options={INVESTMENT_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
      />
      <Field label="Minimum investment (PKR)" name="minimum_investment_pkr" type="number" min={0} step={1} required defaultValue={inv?.minimumInvestmentPkr} />
      <Field label="Total to raise (PKR, optional)" name="target_amount_pkr" type="number" min={0} step={1} defaultValue={inv?.targetAmountPkr ?? undefined} />
      <Field label="Expected timeline" name="expected_duration" defaultValue={inv?.expectedDuration} placeholder="24–30 months" />
      <Field label="Payment structure" name="payment_structure" defaultValue={inv?.paymentStructure} placeholder="Instalments linked to construction" />
      <div className="sm:col-span-2">
        <Field label="Short summary" name="summary" defaultValue={inv?.summary} maxLength={300} />
      </div>
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-stone-700">Description</span>
        <textarea name="description" rows={5} defaultValue={inv?.description} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-stone-700">
          How returns work <span className="text-red-600">*</span>
        </span>
        <textarea
          name="returns_note"
          rows={2}
          required
          maxLength={500}
          defaultValue={inv?.returnsNote ?? "Profit share as set out in the written investment agreement. Returns are not guaranteed."}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
        />
        <span className="mt-1 block text-xs text-stone-500">Describe the arrangement. Do not promise a guaranteed or fixed return.</span>
      </label>
      <Field
        label="Figures last reviewed"
        name="figures_reviewed_on"
        type="date"
        required
        max={new Date().toISOString().slice(0, 10)}
        defaultValue={inv?.figuresReviewedOn ?? new Date().toISOString().slice(0, 10)}
        hint="Change this whenever you check the minimum, target, timeline and returns. It is shown to investors."
      />
      <div className="sm:col-span-2">
        <ImageField current={inv?.imagePath} />
      </div>
      <Field label="Display order" name="sort_order" type="number" min={0} defaultValue={inv?.sortOrder ?? 0} />
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="published" defaultChecked={inv?.published ?? true} className="h-4 w-4" />
        Published on the website
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
          {inv ? "Save changes" : "Create opportunity"}
        </button>
      </div>
    </form>
  );
}
