import Link from "next/link";
import type { Metadata } from "next";
import { Emphasis, HomeImage, Pill } from "@/components/home/HomeImage";
import { CategoryIcon, WhatsAppIcon } from "@/components/home/icons";
import { PropertiesToggle, type HomeListing } from "@/components/home/PropertiesToggle";
import { BRAND } from "@/lib/brand";
import { DIVISIONS, INVESTMENT_TYPES, PROJECT_CATEGORIES, labelOf } from "@/lib/catalog";
import {
  getCompany,
  getFeaturedProjects,
  getHeroContent,
  getHeroMedia,
  getHomeExtras,
  getPublicProjectBadge,
  getLatestNews,
  getOffices,
  getProjectCategoryCounts,
  getPropertiesWithProject,
  getPublishedInvestments,
  getSiteStats,
} from "@/lib/data";
import { formatDate, formatPKR, plural } from "@/lib/format";
import { HOME_DESCRIPTION, SITE_URL, absoluteUrl, jsonLd, openingHoursSpec, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getHeroContent();
  return pageMetadata({
    title: `${BRAND.name} — Architecture, Construction & Properties in ${BRAND.city}`,
    description: HOME_DESCRIPTION,
    path: "/",
  });
}

// Shared layout values from the design: 1280px container, 24px gutters, 96px section padding.
const CONTAINER = "mx-auto max-w-[1280px] px-6";
const SECTION = `${CONTAINER} py-24`;
const H2 = "font-serif text-[clamp(40px,5vw,64px)] leading-none text-ink";
const EYEBROW = "text-xs font-semibold tracking-[0.24em] uppercase";
const PILL_DARK = "inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-ink px-7 text-[15px] font-semibold text-paper hover:bg-body";
const PILL_OUTLINE =
  "inline-flex min-h-[52px] items-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-semibold text-ink hover:bg-ink hover:text-paper";
const UNDERLINE_LINK = "w-fit border-b border-ink pb-1 text-[15px] font-semibold text-ink hover:text-muted";

const TICKER = ["Naqsha", "Approvals & NOC", "Grey structure", "Turnkey", "Waterproofing", "Buy · Rent · Sell"];

const DIVISION_TAGS: Record<string, string[]> = {
  architecture: ["Naqsha", "3D views", "NOC"],
  construction: ["Turnkey", "Renovation", "Seelan fix"],
  properties: ["Buy", "Rent", "Sell"],
};

const STEPS = [
  { title: "Naqsha & design", text: "Site visit, requirements, architectural drawings and 3D views." },
  { title: "Approvals & NOC", text: "Structural drawings, estimates and the paperwork handled for you." },
  { title: "Construction", text: "Grey structure to finishing, with stage-by-stage progress online." },
  { title: "Handover", text: "Final inspection, documents in your portal, keys in your hand." },
];

const TRUST = [
  { title: "Approvals handled", text: "Drawings, NOC and paperwork done by our own team before work begins." },
  { title: "Progress you can see", text: "Every stage is published online, with your own customer portal for payments and documents." },
  { title: "Written agreements", text: "Clear terms for every booking, build and investment — no verbal promises." },
  { title: "Three city offices", text: "Rahim Yar Khan head office, with teams in Lahore and Karachi." },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  // Independent queries in parallel; each fetches only the rows this page shows.
  const [company, offices, hero, heroMedia, stats, featured, forSale, forRent, latest, counts, investments, extras] = await Promise.all([
    getCompany(),
    getOffices(),
    getHeroContent(),
    getHeroMedia(),
    getSiteStats(),
    getFeaturedProjects(3),
    getPropertiesWithProject({ status: "Available", listingType: "sale", publishedOnly: true }, 3),
    getPropertiesWithProject({ status: "Available", listingType: "rent", publishedOnly: true }, 3),
    getLatestNews(3),
    getProjectCategoryCounts(),
    getPublishedInvestments(),
    getHomeExtras(),
  ]);
  const openInvestments = investments.filter((i) => i.status === "open").slice(0, 4);
  const head = offices.find((o) => o.city === BRAND.city) ?? offices[0];
  const otherCities = offices.filter((o) => o.id !== head?.id).map((o) => o.city);
  const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`;
  const tel = `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`;
  // The badge belongs to the photo: only the project the admin says the large photo shows, if it is public.
  const lead = heroMedia.badgeProjectId ? await getPublicProjectBadge(heroMedia.badgeProjectId) : undefined;

  const toListing = (p: (typeof forSale)[number]): HomeListing => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    locality: p.locality,
    city: p.city,
    type: p.type,
    size: p.size,
    price: formatPKR(p.price_pkr),
    imagePath: p.image_path,
  });

  const hours = openingHoursSpec(extras.hours);
  const region = (city: string) => (city === "Karachi" ? "Sindh" : "Punjab");
  // One entry per office: the head office is the main business, Lahore and Karachi are its branches.
  const officeLd = (o: (typeof offices)[number]) => ({
    "@type": ["GeneralContractor", "RealEstateAgent"],
    name: `${company.name} — ${o.city}`,
    telephone: o.phone,
    address: { "@type": "PostalAddress", streetAddress: o.address, addressLocality: o.city, addressRegion: region(o.city), addressCountry: "PK" },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company.name} ${o.address} ${o.city}`)}`,
    ...(hours ? { openingHoursSpecification: [hours] } : {}),
  });
  const organization = {
    "@context": "https://schema.org",
    "@type": ["Organization", "GeneralContractor", "RealEstateAgent"],
    "@id": `${SITE_URL}/#organization`,
    name: company.name,
    alternateName: BRAND.domain,
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    email: company.email,
    telephone: BRAND.phoneIntl,
    slogan: company.tagline,
    description: HOME_DESCRIPTION,
    image: absoluteUrl("/images/og-default.jpg"),
    priceRange: "PKR",
    ...(head ? { address: officeLd(head).address, hasMap: officeLd(head).hasMap } : {}),
    ...(hours ? { openingHoursSpecification: [hours] } : {}),
    department: offices.filter((o) => o.id !== head?.id).map(officeLd),
    areaServed: ["Rahim Yar Khan", "Lahore", "Karachi", "Punjab", "Sindh", "Pakistan"],
    sameAs: Object.values(extras.social).filter(Boolean),
    knowsAbout: ["Architecture", "Construction", "Petrol pump NOC", "LPG plant consultancy", "Cost estimation", "Waterproofing", "Real estate"],
  };

  const heroStats = [
    { value: String(stats.projects), label: "Active projects" },
    { value: String(stats.availableUnits), label: "Units available now" },
    extras.years ? { value: extras.years, label: "Years of experience" } : { value: String(stats.cities), label: "City offices" },
  ];

  const divisions = [
    ...DIVISIONS.map((d) => ({ key: d.key, href: d.path, title: d.label, text: d.summary })),
    { key: "properties", href: "/properties", title: "Properties", text: "Buy, rent or sell houses, plots, shops and commercial property across three cities." },
  ];

  return (
    <div className="bg-paper text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organization)} />

      {/* 3. Hero */}
      {hero.active && (
        <section aria-labelledby="hero-title" className={`${CONTAINER} grid gap-12 pt-[72px] pb-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]`}>
          <div className="flex min-w-0 flex-col justify-between gap-10">
            <div className="flex flex-col gap-7">
              {hero.subtitle && (
                <p className={`flex items-center gap-3 ${EYEBROW} text-muted`}>
                  <span aria-hidden className="inline-block h-px w-8 bg-ink" />
                  {hero.subtitle}
                </p>
              )}
              <h1 id="hero-title" className="font-serif text-[clamp(52px,7.2vw,104px)] leading-[0.95] text-ink">
                <Emphasis text={hero.title} />
              </h1>
              {hero.description && <p className="max-w-[520px] text-lg leading-relaxed text-body">{hero.description}</p>}
              <div className="flex flex-wrap gap-3">
                {hero.buttonText && hero.buttonUrl && (
                  <Link href={hero.buttonUrl} className={PILL_DARK}>
                    {hero.buttonText} <span aria-hidden>→</span>
                  </Link>
                )}
                {hero.secondaryButtonText && hero.secondaryButtonUrl && (
                  <Link href={hero.secondaryButtonUrl} className={PILL_OUTLINE}>
                    {hero.secondaryButtonText}
                  </Link>
                )}
              </div>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2.5 font-medium ${UNDERLINE_LINK}`}>
                <WhatsAppIcon />
                Prefer to talk? Chat with sales on WhatsApp
              </a>
            </div>
            <dl className="grid grid-cols-3 border-t border-ink">
              {heroStats.map((s, i) => (
                <div key={s.label} className={`flex flex-col-reverse justify-end pt-5 ${i === 0 ? "pr-4" : i === 1 ? "border-l border-line px-4" : "border-l border-line pl-4"}`}>
                  <dt className="mt-1.5 text-[13px] text-muted">{s.label}</dt>
                  <dd className="font-serif text-[clamp(40px,5vw,52px)] leading-none">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid min-w-0 grid-cols-2 grid-rows-[260px_170px] gap-3 sm:grid-rows-[340px_220px]">
            <HomeImage
              src={hero.imagePath}
              alt={heroMedia.mainAlt}
              dark
              preload
              sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, 100vw"
              className="col-span-2 rounded-tile"
            >
              {lead && (
                <div className="flex w-full items-end justify-end p-5">
                  {/* Live progress of the project shown in this photo (Admin → Website content). */}
                  <Pill>
                    {lead.name} · {lead.progress_percent}%
                  </Pill>
                </div>
              )}
            </HomeImage>
            {/* Portrait photo cropped into a near-square tile: keep the forecourt and shop in frame, not the sky. */}
            <HomeImage
              src={heroMedia.secondImage}
              alt={heroMedia.secondAlt}
              position="50% 72%"
              className="rounded-tile"
              sizes="(min-width: 1280px) 280px, (min-width: 1024px) 22vw, 50vw"
            />
            <div className="flex flex-col justify-between rounded-tile bg-ink p-5 text-paper">
              <span className="text-xs tracking-[0.2em] text-dim uppercase">Offices</span>
              <div className="flex flex-col gap-1">
                <span className="font-serif text-[clamp(20px,2.4vw,26px)] leading-tight">{head?.city}</span>
                {otherCities.length > 0 && <span className="font-serif text-[clamp(20px,2.4vw,26px)] leading-tight text-dim">{otherCities.join(" · ")}</span>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Ticker */}
      <div className="overflow-hidden border-y border-ink" aria-label="What we do">
        {/* Stars only where the strip fits on one line; when it wraps, no line may start with a separator. */}
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-1 px-6 py-[18px] font-serif text-[clamp(22px,2.6vw,28px)] italic 2xl:gap-x-10">
          {TICKER.map((item, i) => (
            <li key={item} className="flex items-center gap-10 whitespace-nowrap">
              {i > 0 && (
                <span aria-hidden className="hidden text-star not-italic 2xl:inline">
                  ✦
                </span>
              )}
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* 5. Divisions */}
      <section aria-labelledby="divisions-title" className={SECTION}>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 id="divisions-title" className={`${H2} max-w-[640px]`}>
            One team for the whole journey — <em className="text-muted">plot to possession.</em>
          </h2>
          <p className="max-w-[380px] leading-relaxed text-body">
            Three divisions under one roof, so drawings, construction and sales never fall out of sync.
          </p>
        </div>
        <div className="grid border-t border-ink md:grid-cols-3">
          {divisions.map((d, i) => (
            <Link
              key={d.key}
              href={d.href}
              className={`flex flex-col gap-5 border-b border-line pt-8 pb-9 transition-transform duration-200 hover:-translate-y-1 md:pr-7 ${i > 0 ? "md:border-l md:pl-7" : ""}`}
            >
              <span className="text-[13px] font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-serif text-[40px] leading-none">{d.title}</span>
              <span className="text-[15px] leading-relaxed text-body">{d.text}</span>
              <span className="flex flex-wrap gap-2">
                {(DIVISION_TAGS[d.key] ?? []).map((t) => (
                  <span key={t} className="rounded-full border border-line-strong px-3 py-1.5 text-xs">
                    {t}
                  </span>
                ))}
              </span>
              <span className="mt-auto text-[15px] font-semibold">
                Explore {d.title.toLowerCase()} <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. How we work */}
      <section aria-labelledby="process-title" className="bg-ink text-paper">
        <div className={SECTION}>
          <p className={`mb-5 ${EYEBROW} text-dim`}>How we work</p>
          <h2 id="process-title" className="mb-14 max-w-[760px] font-serif text-[clamp(40px,5vw,64px)] leading-none">
            Four clear steps. <em className="text-dim">You see every one of them.</em>
          </h2>
          <ol className="grid gap-px border border-line-dark bg-line-dark sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex min-h-[240px] flex-col gap-4 bg-ink px-7 py-8">
                <span className="font-serif text-[56px] leading-none text-quiet">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-xl font-semibold">{s.title}</span>
                <span className="text-[15px] leading-relaxed text-faint">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. Featured projects */}
      <section aria-labelledby="projects-title" className={SECTION}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`mb-4 ${EYEBROW} text-muted`}>Featured projects</p>
            <h2 id="projects-title" className={H2}>
              Work in progress
            </h2>
          </div>
          <Link href="/projects" className={UNDERLINE_LINK}>
            All projects <span aria-hidden>→</span>
          </Link>
        </div>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.slug}`} className="flex flex-col gap-[18px] transition-transform duration-200 hover:-translate-y-1">
                <HomeImage src={p.image_path} alt={p.name} className="h-[280px] rounded-card">
                  <div className="flex w-full items-start justify-between gap-2 p-4">
                    <Pill>
                      {labelOf(DIVISIONS, p.division)} · {labelOf(PROJECT_CATEGORIES, p.category)}
                    </Pill>
                    <Pill tone="dark">{p.progress_percent}%</Pill>
                  </div>
                </HomeImage>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[22px] font-semibold tracking-tight">{p.name}</span>
                  <span className="text-sm text-muted">{[p.location, p.city].filter(Boolean).join(", ")}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[13px] text-body">
                    <span>{p.status}</span>
                    <span>{p.progress_percent}%</span>
                  </div>
                  <div
                    className="h-[3px] overflow-hidden rounded-sm bg-line"
                    role="progressbar"
                    aria-label={`${p.name} progress`}
                    aria-valuenow={p.progress_percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full bg-ink" style={{ width: `${p.progress_percent}%` }} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Categories */}
      <section aria-labelledby="categories-title" className="bg-mist">
        <div className={SECTION}>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="categories-title" className={`${H2} max-w-[620px]`}>
              We build for <em className="text-muted">every</em> category
            </h2>
            <p className="max-w-[360px] leading-relaxed text-body">From a 5 Marla home to petrol pumps, flour mills, schools and hospitals.</p>
          </div>
          <ul className="grid gap-px border border-line-strong bg-line-strong sm:grid-cols-2 lg:grid-cols-4">
            {PROJECT_CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link href={`/projects?category=${c.key}`} className="flex h-full min-h-[170px] flex-col justify-between gap-7 bg-paper p-7 hover:bg-mist">
                  <CategoryIcon category={c.key} className="text-ink" />
                  <span className="flex items-end justify-between gap-3">
                    <span className="text-lg font-semibold">{c.label}</span>
                    <span className="whitespace-nowrap text-[13px] text-muted">{plural(counts[c.key] ?? 0, "project")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. Properties */}
      <section id="properties" aria-labelledby="properties-title" className={`${SECTION} scroll-mt-24`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-10">
          <div>
            <p className={`mb-4 ${EYEBROW} text-muted`}>Properties</p>
            <h2 id="properties-title" className={H2}>
              Find your next address
            </h2>
          </div>
          <PropertiesToggle sale={forSale.map(toListing)} rent={forRent.map(toListing)} initial={listing === "rent" ? "rent" : listing === "sale" ? "sale" : undefined} />
        </div>
      </section>

      {/* 10. Investment */}
      {openInvestments.length > 0 && (
        <section aria-labelledby="invest-title" className="bg-ink text-paper">
          <div className={`${SECTION} grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]`}>
            <div className="flex min-w-0 flex-col gap-6">
              <p className={`${EYEBROW} text-dim`}>Investment</p>
              <h2 id="invest-title" className="font-serif text-[clamp(40px,5vw,64px)] leading-none">
                Invest in our next <em className="text-dim">developments.</em>
              </h2>
              <p className="leading-relaxed text-faint">Plazas, homes, shops and markets — under written agreements, with progress you can follow online.</p>
              <Link
                href="/investment"
                className="inline-flex min-h-[52px] w-fit items-center rounded-full bg-paper px-7 text-[15px] font-semibold text-ink hover:bg-faint"
              >
                See all opportunities <span aria-hidden className="ml-1">→</span>
              </Link>
              <p className="max-w-[380px] text-xs leading-relaxed text-quiet">
                Returns are not guaranteed. All terms are set out in a written agreement. Figures shown are indicative and may change.
              </p>
            </div>
            <ul className="flex min-w-0 flex-col border-t border-line-dark-strong">
              {openInvestments.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/investment/${i.slug}`}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-x-4 gap-y-3 border-b border-line-dark-strong py-6 hover:bg-ph-dark sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_24px]"
                  >
                    <span className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
                      <span className="text-lg font-semibold">{i.title}</span>
                      <span className="text-[13px] text-dim">{labelOf(INVESTMENT_TYPES, i.investmentType)}</span>
                    </span>
                    <span aria-hidden className="row-start-1 col-start-3 text-lg sm:hidden">
                      →
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-xs text-dim">From</span>
                      <span className="font-serif text-2xl">{formatPKR(i.minimumInvestmentPkr)}</span>
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-xs text-dim">Timeline</span>
                      <span className="text-[15px]">{i.expectedDuration}</span>
                    </span>
                    <span aria-hidden className="hidden text-lg sm:block">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 11. Why trust us */}
      <section aria-labelledby="trust-title" className={SECTION}>
        <h2 id="trust-title" className={`mb-12 ${H2} max-w-[700px]`}>
          Why families and businesses <em className="text-muted">trust us</em>
        </h2>
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <li key={t.title} className="flex flex-col gap-3.5 border-t-2 border-ink pt-6">
              <span className="text-lg font-semibold">{t.title}</span>
              <span className="text-[15px] leading-relaxed text-body">{t.text}</span>
            </li>
          ))}
        </ul>
        {extras.testimonials.length > 0 && (
          <div className="mt-[72px] grid gap-6 md:grid-cols-2">
            {extras.testimonials.map((t) => (
              <figure key={t.quote} className="flex flex-col gap-6 rounded-card bg-mist p-9">
                <blockquote className="font-serif text-[28px] leading-tight">&ldquo;{t.quote}&rdquo;</blockquote>
                {(t.name || t.project) && <figcaption className="text-sm text-muted">{[t.name, t.project].filter(Boolean).join(" · ")}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* 12. Latest news */}
      {latest.length > 0 && (
        <section aria-labelledby="news-title" className="border-t border-line">
          <div className={SECTION}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="news-title" className={H2}>
                Latest news
              </h2>
              <Link href="/news" className={UNDERLINE_LINK}>
                All updates <span aria-hidden>→</span>
              </Link>
            </div>
            <ul className="flex flex-col border-t border-ink">
              {latest.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/news/${n.slug}`}
                    className="grid grid-cols-[minmax(0,1fr)_24px] items-center gap-x-6 gap-y-2 border-b border-line py-7 hover:bg-mist sm:grid-cols-[140px_minmax(0,1fr)_24px]"
                  >
                    <time dateTime={n.published_on} className="col-span-2 text-sm text-muted sm:col-span-1">
                      {formatDate(n.published_on)}
                    </time>
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="font-serif text-[clamp(24px,3vw,30px)] leading-tight">{n.title}</span>
                      <span className="text-sm text-muted">{n.excerpt}</span>
                    </span>
                    <span aria-hidden className="text-xl">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 13. Contact CTA */}
      <section aria-labelledby="contact-title" className={`${CONTAINER} pb-24`}>
        <div className="flex flex-wrap items-end justify-between gap-10 rounded-box border-[1.5px] border-ink p-[clamp(32px,5vw,72px)]">
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4">
            <h2 id="contact-title" className="font-serif text-[clamp(48px,6vw,88px)] leading-[0.95]">
              Planning a project? <em className="text-muted">Let&rsquo;s talk.</em>
            </h2>
            <p className="text-body">
              Call or WhatsApp {BRAND.phone} · {company.email}
              {extras.hours && ` · ${extras.hours}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact#enquiry" className={PILL_DARK}>
              Get a quotation
            </Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={PILL_OUTLINE}>
              WhatsApp
            </a>
            <a href={tel} className={PILL_OUTLINE}>
              Call now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
