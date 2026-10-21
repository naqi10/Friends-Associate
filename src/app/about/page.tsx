import type { Metadata } from "next";
import Image from "next/image";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      {page.intro && <p className="mt-4 text-lg text-stone-600">{page.intro}</p>}

      {company.experience && (
        <section aria-labelledby="profile" className="mt-10">
          <h2 id="profile" className="text-xl font-semibold">
            Company profile
          </h2>
          <p className="mt-2 whitespace-pre-line text-stone-700">{company.experience}</p>
        </section>
      )}
      {company.mission && (
        <section aria-labelledby="mission" className="mt-8">
          <h2 id="mission" className="text-xl font-semibold">
            Mission
          </h2>
          <p className="mt-2 whitespace-pre-line text-stone-700">{company.mission}</p>
        </section>
      )}
      {company.vision && (
        <section aria-labelledby="vision" className="mt-8">
          <h2 id="vision" className="text-xl font-semibold">
            Vision
          </h2>
          <p className="mt-2 whitespace-pre-line text-stone-700">{company.vision}</p>
        </section>
      )}

      {lists
        .filter((l) => l.items.length > 0)
        .map((l) => (
          <section key={l.key} aria-labelledby={l.key} className="mt-8">
            <h2 id={l.key} className="text-xl font-semibold">
              {l.title}
            </h2>
            <ul className="mt-3 space-y-2 text-stone-700">
              {l.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-teal-800">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

      {management.length > 0 && (
        <section aria-labelledby="management" className="mt-10">
          <h2 id="management" className="text-xl font-semibold">
            Management
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {management.map((m) => (
              <li key={m.id} className="flex gap-4 rounded-lg border border-stone-200 bg-white p-4">
                {hasRealImage(m.photo_path) ? (
                  <Image src={m.photo_path} alt={m.name} width={72} height={72} className="h-18 w-18 shrink-0 rounded-full object-cover" style={{ objectPosition: focalPosition(m.photo_path) }} />
                ) : (
                  <span aria-hidden className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl font-semibold text-stone-500">
                    {m.name.charAt(0)}
                  </span>
                )}
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-teal-800">{m.title}</p>
                  {m.experience && <p className="mt-1 text-xs text-stone-500">{m.experience}</p>}
                  {m.bio && <p className="mt-2 text-sm text-stone-600">{m.bio}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
