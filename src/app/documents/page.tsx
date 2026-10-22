import Link from "next/link";
import { CONTAINER, PageHero } from "@/components/public/ui";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { getPageContent, getPublicDocuments } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";

export const metadata: Metadata = pageMetadata({
  title: "Documents",
  description: "Public brochures and company documents from Friends Associates.",
  path: "/documents",
});

export default async function DocumentsPage() {
  const [can, page] = await Promise.all([getSessionUser().then(permissionsFor), getPageContent("page.documents")]);
  if (!can("documents", "view")) {
    return (
      <div className="bg-paper text-ink">
        <PageHero title={page.title} intro="Documents are not available at the moment. Please contact Friends Associates sales." eyebrow="Documents" />
      </div>
    );
  }
  const docs = await getPublicDocuments();
  return (
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow="Documents" />
      <div className={`${CONTAINER} py-14 md:py-20`}>
        {docs.length === 0 ? (
          <p className="mx-auto max-w-xl rounded-card border border-dashed border-line-strong p-8 text-center text-body">No documents published yet.</p>
        ) : (
          <ul className="mx-auto grid max-w-[1000px] gap-4 md:grid-cols-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-4 rounded-card border border-line bg-paper p-5">
                <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5M9 13h6M9 17h6" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-sm text-muted">{formatDate(d.issued_on)}</p>
                </div>
                {d.storage_path ? (
                  <Link href={`/api/documents/${d.id}/download`} className="rounded-full border-[1.5px] border-ink px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-paper">
                    Download
                  </Link>
                ) : (
                  <span className="text-sm text-muted">Coming soon</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
