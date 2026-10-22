import Link from "next/link";

/**
 * Shared layout for every public inner page, matching the home page: the same 1280px column and 24px side padding
 * as the header (so content lines up with the logo and menu), centred page headings, and the same buttons and cards.
 */
export const CONTAINER = "mx-auto w-full max-w-[1280px] px-6";
export const BTN_DARK = "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-7 text-[15px] font-semibold text-paper hover:bg-body";
export const BTN_OUTLINE =
  "inline-flex min-h-[52px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-semibold text-ink hover:bg-ink hover:text-paper";
export const BTN_SMALL_DARK = "inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-body";
export const BTN_SMALL_OUTLINE = "inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-ink px-5 text-sm font-semibold text-ink hover:bg-ink hover:text-paper";
export const CARD = "rounded-card border border-line bg-paper";
export const INPUT = "mt-1.5 w-full rounded-xl border-[1.5px] border-line-strong bg-paper px-4 py-3 text-[15px] text-ink outline-none focus:border-ink";
export const LABEL = "block text-sm font-medium text-body";
export const EYEBROW = "text-xs font-semibold tracking-[0.24em] uppercase";

export type Crumb = { href?: string; label: string };

/** Centred page heading: breadcrumb, eyebrow, serif title, intro and buttons, with equal space on both sides. */
export function PageHero({
  title,
  intro,
  eyebrow = "Friends Associates",
  crumbs,
  children,
  tone = "light",
}: {
  title: string;
  intro?: string | null;
  eyebrow?: string | null;
  crumbs?: Crumb[];
  children?: React.ReactNode;
  tone?: "light" | "mist";
}) {
  return (
    <section className={`border-b border-line ${tone === "mist" ? "bg-mist" : "bg-paper"}`}>
      <div className={`${CONTAINER} flex flex-col items-center py-14 text-center md:py-20`}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap justify-center gap-x-2 text-sm text-muted">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-ink hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-body">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className={`flex items-center gap-3 ${EYEBROW} text-muted`}>
            <span aria-hidden className="inline-block h-px w-8 bg-ink" />
            {eyebrow}
            <span aria-hidden className="inline-block h-px w-8 bg-ink" />
          </p>
        )}
        <h1 className="mt-5 max-w-[900px] font-serif text-[clamp(44px,6vw,84px)] leading-[0.98] text-balance text-ink">{title}</h1>
        {intro && <p className="mt-5 max-w-[680px] text-lg leading-relaxed text-body">{intro}</p>}
        {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}

/** Centred section heading used inside inner pages. */
export function SectionHead({ id, eyebrow, title, intro }: { id?: string; eyebrow?: string; title: React.ReactNode; intro?: string | null }) {
  return (
    <div className="mx-auto mb-10 flex max-w-[760px] flex-col items-center text-center">
      {eyebrow && <p className={`mb-4 ${EYEBROW} text-muted`}>{eyebrow}</p>}
      <h2 id={id} className="font-serif text-[clamp(36px,4.4vw,56px)] leading-none text-balance text-ink">
        {title}
      </h2>
      {intro && <p className="mt-4 leading-relaxed text-body">{intro}</p>}
    </div>
  );
}
