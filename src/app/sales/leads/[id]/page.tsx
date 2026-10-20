import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Notice, SelectField } from "@/components/admin/Field";
import { deleteLeadAction } from "@/lib/actions/lifecycle";
import { updateLeadAction } from "@/lib/actions/leads";
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from "@/lib/catalog";
import { getAssignableStaff, getLead } from "@/lib/data";
import { requireStaff } from "@/lib/permissions";

export const metadata: Metadata = { title: "Lead", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

/** Structured answers (e.g. preferred call time) stored with the lead, shown as a simple list. */
function detailsList(details: string | null) {
  if (!details) return [];
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed).filter(([k, v]) => k !== "inquiryId" && v !== "" && v != null);
  } catch {
    return [];
  }
}

export default async function LeadPage({ params, searchParams }: Props) {
  const { can } = await requireStaff("leads", "view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [lead, staff] = await Promise.all([getLead(id), getAssignableStaff()]);
  if (!lead) notFound();
  const canEdit = can("leads", "update");

  const facts: { label: string; value: string; href?: string }[] = [
    { label: "Phone", value: lead.phone, href: `tel:${lead.phone.replace(/[^\d+]/g, "")}` },
    { label: "WhatsApp", value: "Open chat", href: `https://wa.me/${lead.phone.replace(/\D/g, "").replace(/^0/, "92")}` },
    { label: "Email", value: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
    { label: "City", value: lead.city },
    { label: "Source", value: labelOf(LEAD_SOURCES, lead.source) },
    { label: "Service", value: lead.service },
    { label: "Location", value: lead.location },
    { label: "Size", value: lead.size },
    { label: "Budget / amount", value: lead.budget },
    { label: "Received", value: lead.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) },
    ...detailsList(lead.details).map(([k, v]) => ({ label: k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value: String(v) })),
  ].filter((f) => f.value);

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <Link href="/sales" className="text-sm text-stone-600 hover:underline">
        ← All leads
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{lead.name}</h1>
      <p className="text-sm text-stone-600">
        {lead.interest} · {labelOf(LEAD_STATUSES, lead.status)}
      </p>
      <Notice message={sp.saved === "created" ? "Lead added." : sp.saved ? "Lead updated." : undefined} />
      <FormError code={sp.error} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="admin-card p-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-stone-500">{f.label}</dt>
                <dd className="font-medium">
                  {f.href ? (
                    <a href={f.href} className="text-teal-800 underline" target={f.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                      {f.value}
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {lead.message && (
            <div className="mt-6">
              <h2 className="text-sm text-stone-500">Message</h2>
              <p className="mt-1 whitespace-pre-line text-sm">{lead.message}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {lead.property && (
              <Link href={`/properties/${lead.property.id}`} className="text-teal-800 underline" target="_blank">
                Listing: {lead.property.title}
              </Link>
            )}
            {lead.project && (
              <Link href={`/projects/${lead.project.slug}`} className="text-teal-800 underline" target="_blank">
                Project: {lead.project.name}
              </Link>
            )}
            {lead.investment && (
              <Link href={`/investment/${lead.investment.slug}`} className="text-teal-800 underline" target="_blank">
                Investment: {lead.investment.title}
              </Link>
            )}
          </div>
        </section>

        <section className="admin-card p-6">
          <h2 className="font-semibold">Follow-up</h2>
          <form action={updateLeadAction} className="mt-4 space-y-4">
            <fieldset disabled={!canEdit} className="space-y-4">
              <input type="hidden" name="id" value={lead.id} />
              <SelectField label="Status" name="status" defaultValue={lead.status} options={LEAD_STATUSES.map((s) => ({ value: s.key, label: s.label }))} />
              <SelectField
                label="Assigned to"
                name="assigned_to_id"
                defaultValue={lead.assignedTo?.id ?? ""}
                options={[{ value: "", label: "— Unassigned —" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]}
              />
              <label className="block text-sm">
                <span className="font-medium text-stone-700">Follow-up date</span>
                <input type="date" name="follow_up_date" defaultValue={lead.followUpDate ?? ""} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-700">Internal notes</span>
                <textarea name="notes" rows={6} maxLength={5000} defaultValue={lead.notes} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
              </label>
              {canEdit ? (
                <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
                  Save
                </button>
              ) : (
                <p className="text-xs text-stone-500">Read-only: you can view leads but not update them.</p>
              )}
            </fieldset>
          </form>
        </section>
      </div>

      {can("leads", "delete") && (
        <form action={deleteLeadAction} className="mt-6 rounded-[28px] border-2 border-red-200 bg-white shadow-[0_18px_40px_-18px_rgb(14_14_14/0.28)] p-6">
          <input type="hidden" name="id" value={lead.id} />
          <h2 className="font-semibold text-red-800">Delete lead</h2>
          <p className="mt-1 text-sm text-stone-600">For spam or duplicates. Real enquiries that did not work out should be set to Closed instead, so they stay in the reports.</p>
          <ConfirmButton className="mt-3" message={`Delete the lead from ${lead.name}? This cannot be undone.`}>
            Delete lead
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
