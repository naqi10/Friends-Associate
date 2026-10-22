import type { Metadata } from "next";
import Image from "next/image";
import { CONTAINER, PageHero, SectionHead } from "@/components/public/ui";
import { pageMetadata, metaDescription } from "@/lib/seo";
import { getAboutLists, getCompany, getManagement, getPageContent } from "@/lib/data";
import { focalPosition, hasRealImage } from "@/lib/media";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContent("page.about");
  return pageMetadata({
    title: "About us",
    description: metaDescription(page.intro, "Company profile, mission, vision and leadership at Friends Associates."),
    path: "/about",
  });
}

export default async function AboutPage() {
  const [page, company, lists, management] = await Promise.all([
    getPageContent("page.about"),
    getCompany(),
    getAboutLists(),
    getManagement(),
  ]);

  const intro = [
    { id: "profile", title: "Company profile", text: company.experience },
    { id: "mission", title: "Mission", text: company.mission },
    { id: "vision", title: "Vision", text: company.vision },
  ].filter((b) => b.text);
  const filled = lists.filter((l) => l.items.length > 0);

  return (
    <div className="bg-paper text-ink">
      <PageHero title={page.title} intro={page.intro} eyebrow="About us" />

      {intro.length > 0 && (
        <section className={`${CONTAINER} py-16 md:py-20`}>
          <div className={`grid gap-6 ${intro.length === 3 ? "lg:grid-cols-3" : intro.length === 2 ? "md:grid-cols-2" : "mx-auto max-w-[760px]"}`}>
            {intro.map((b) => (
              <section key={b.id} aria-labelledby={b.id} className="flex flex-col gap-4 border-t-2 border-ink pt-6">
                <h2 id={b.id} className="font-serif text-[34px] leading-none">
                  {b.title}
                </h2>
                <p className="whitespace-pre-line text-[16px] leading-relaxed text-body">{b.text}</p>
              </section>
            ))}
          </div>
        </section>
      )}

      {filled.length > 0 && (
        <section className="bg-mist">
          <div className={`${CONTAINER} grid gap-6 py-16 md:py-20 ${filled.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-[760px]"}`}>
            {filled.map((l) => (
              <section key={l.key} aria-labelledby={l.key} className="rounded-card border border-line bg-paper p-7">
                <h2 id={l.key} className="font-serif text-[30px] leading-none">
                  {l.title}
                </h2>
                <ul className="mt-5 space-y-3 text-[15px] text-body">
                  {l.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-paper">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}

      {management.length > 0 && (
        <section aria-labelledby="management" className={`${CONTAINER} py-16 md:py-20`}>
          <SectionHead id="management" eyebrow="Our people" title="Management" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {management.map((m) => (
              <li key={m.id} className="flex flex-col items-center rounded-card border border-line bg-paper p-7 text-center">
                {hasRealImage(m.photo_path) ? (
                  <Image src={m.photo_path} alt={m.name} width={112} height={112} className="h-28 w-28 rounded-full object-cover" style={{ objectPosition: focalPosition(m.photo_path) }} />
                ) : (
                  <span aria-hidden className="flex h-28 w-28 items-center justify-center rounded-full bg-mist font-serif text-4xl text-muted">
                    {m.name.charAt(0)}
                  </span>
                )}
                <p className="mt-5 text-[19px] font-semibold">{m.name}</p>
                <p className="text-sm text-muted">{m.title}</p>
                {m.experience && <p className="mt-2 text-xs tracking-[0.12em] text-muted uppercase">{m.experience}</p>}
                {m.bio && <p className="mt-3 text-[15px] leading-relaxed text-body">{m.bio}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
