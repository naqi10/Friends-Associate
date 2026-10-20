import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { CheckboxField, Field, Notice, TextAreaField } from "@/components/admin/Field";
import { deleteFaqAction, saveFaqAction } from "@/lib/actions/site-content";
import { getFaqs, type Faq } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "FAQs" };

const SAVED: Record<string, string> = { faq: "Question saved.", "faq-deleted": "Question removed." };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

function FaqForm({ f }: { f?: Faq }) {
  return (
    <form action={saveFaqAction} className="space-y-3">
      {f && <input type="hidden" name="id" value={f.id} />}
      <Field label="Question" name="question" defaultValue={f?.question} maxLength={200} required />
      <TextAreaField label="Answer" name="answer" defaultValue={f?.answer} maxLength={1500} rows={4} required />
      <div className="flex flex-wrap items-end gap-6">
        <div className="w-36">
          <Field label="Display order" name="sort_order" type="number" min={0} max={999} defaultValue={f?.sortOrder ?? 0} />
        </div>
        <CheckboxField label="Show on the website" name="active" defaultChecked={f ? f.active : true} />
      </div>
      <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
        {f ? "Save" : "Add question"}
      </button>
    </form>
  );
}

export default async function FaqContentPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, faqs] = await Promise.all([searchParams, getFaqs({ includeHidden: true })]);

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <h1 className="text-2xl font-bold">Website content</h1>
      <ContentTabs active="/admin/content/faqs" />
      <p className="mt-4 text-sm text-stone-600">
        Frequently asked questions appear on the{" "}
        <Link href="/contact#faq" target="_blank" className="text-teal-800 underline">
          Contact page
        </Link>
        . The section is hidden while there are no visible questions.
      </p>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      {faqs.length === 0 && <p className="mt-6 text-sm text-stone-500">No questions yet.</p>}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {faqs.map((f) => (
          <details key={f.id} id={`f-${f.id}`} className="scroll-mt-24 admin-card p-5">
            <summary className="cursor-pointer font-medium">
              {f.question}
              {!f.active && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">Hidden</span>}
            </summary>
            <div className="mt-4 border-t pt-4">
              <FaqForm f={f} />
              <form action={deleteFaqAction} className="mt-4 border-t pt-4">
                <input type="hidden" name="id" value={f.id} />
                <ConfirmButton message="Delete this question? This cannot be undone. To hide it instead, untick Show on the website.">
                  Delete this question
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </div>
      <div id="faq-new" className="mt-6 scroll-mt-24 rounded-[28px] border-2 border-dashed border-line-strong bg-white p-5">
        <h2 className="mb-3 font-semibold">Add a question</h2>
        <FaqForm />
      </div>
    </div>
  );
}
