import Link from "next/link";
import { FormError } from "@/components/FormError";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { Field, Notice, TextAreaField } from "@/components/admin/Field";
import { savePageContentAction } from "@/lib/actions/site-content";
import { PAGE_CONTENT, type PageContentKey } from "@/lib/content-defaults";
import { getAllPageContent } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Page headings" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function PageHeadingsPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, pages] = await Promise.all([searchParams, getAllPageContent()]);
  const savedLabel = sp.saved && sp.saved in PAGE_CONTENT ? PAGE_CONTENT[sp.saved as PageContentKey].label : null;

  return (
    <div className="px-5 py-10 sm:px-[30px]">
      <h1 className="text-2xl font-bold">Website content</h1>
      <ContentTabs active="/admin/content/pages" />
      <p className="mt-4 text-sm text-stone-600">
        The heading and short introduction at the top of each page. Changes go live as soon as you save. Leave the introduction empty to hide it.
      </p>
      <Notice message={savedLabel ? `${savedLabel}: saved.` : undefined} />
      <FormError code={sp.error} />

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {pages.map((p) => {
          const def = PAGE_CONTENT[p.key];
          return (
            <form key={p.key} id={p.key} action={savePageContentAction} className="scroll-mt-24 space-y-3 admin-card p-5">
              <input type="hidden" name="key" value={p.key} />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{def.label}</h2>
                <Link href={def.path} target="_blank" className="text-xs text-teal-800 hover:underline">
                  View page ↗
                </Link>
              </div>
              <Field label="Heading" name="title" defaultValue={p.title} maxLength={120} required />
              <TextAreaField label="Introduction" name="intro" defaultValue={p.intro} maxLength={600} rows={3} />
              <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
                Save
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
