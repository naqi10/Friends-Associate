import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallbackForm } from "@/components/public/EnquiryForms";
import { ProductCard, ProductImage } from "@/components/public/ProductCard";
import { BTN_DARK, BTN_OUTLINE, CARD, CONTAINER } from "@/components/public/ui";
import { BRAND } from "@/lib/brand";
import { PRODUCT_CATEGORIES, labelOf } from "@/lib/catalog";
import { getCompany, getPublishedProduct, getPublishedProducts } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedProduct(slug);
  if (!p) return { title: "Product not found" };
  return pageMetadata({ title: p.name, description: p.summary || `${p.name} from Friends Associates, Rahim Yar Khan.`, path: `/products/${p.slug}` });
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [p, company, all] = await Promise.all([getPublishedProduct(slug), getCompany(), getPublishedProducts()]);
  if (!p) notFound();
  const category = labelOf(PRODUCT_CATEGORIES, p.category);
  const related = all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Assalam-o-Alaikum, I want to order: ${p.name}`)}`;

  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className={`${CONTAINER} py-8 md:py-14`}>
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-x-2 text-sm text-muted">
            <Link href="/products" className="hover:text-ink hover:underline">
              Products
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/products?c=${p.category}`} className="hover:text-ink hover:underline">
              {category}
            </Link>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
            <ProductImage p={p} sizes="(min-width: 1024px) 600px, 100vw" className="aspect-square rounded-box lg:aspect-[4/3.4]" />
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
                {category}
                {p.brand && ` · ${p.brand}`}
              </p>
              <h1 className="mt-3 font-serif text-[clamp(36px,4.6vw,58px)] leading-[1.02] text-balance">{p.name}</h1>
              {p.summary && <p className="mt-4 text-lg leading-relaxed text-body">{p.summary}</p>}

              <div className={`${CARD} mt-6 p-5`}>
                <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Price</h2>
                {p.options.length === 0 ? (
                  <p className="mt-2 text-[22px] font-semibold">Call for price</p>
                ) : (
                  <ul className="mt-2 divide-y divide-line">
                    {p.options.map((o, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="text-body">{o.label || p.name.split(" – ")[0]}</span>
                        <span className="text-right whitespace-nowrap">
                          <span className="text-[22px] font-semibold">Rs {o.pricePkr.toLocaleString("en-PK")}</span>
                          {o.unit && <span className="ml-1.5 text-sm text-muted">{o.unit}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {p.note && <p className="mt-3 text-sm text-muted">{p.note}</p>}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BTN_DARK}>
                  Order on WhatsApp
                </a>
                <a href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`} className={BTN_OUTLINE}>
                  Call {BRAND.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-canvas py-12 md:py-16">
        <div className={`${CONTAINER} grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]`}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {p.benefits.length > 0 && (
              <div className={`${CARD} p-6`}>
                <h2 className="text-xl font-semibold">Benefits</h2>
                <ul className="mt-4 space-y-2.5">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex gap-3 text-body">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.specs.length > 0 && (
              <div className={`${CARD} p-6`}>
                <h2 className="text-xl font-semibold">Technical data</h2>
                <ul className="mt-4 divide-y divide-line">
                  {p.specs.map((s) => (
                    <li key={s} className="py-2.5 text-body">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted md:col-span-2 lg:col-span-1 xl:col-span-2">
              Application method, dilution, coverage and safety precautions must be followed as per the manufacturer / product label.
            </p>
          </div>
          <CallbackForm returnTo={`/products/${p.slug}`} interest={`Product: ${p.name}`.slice(0, 150)} sent={sp.sent} error={sp.error} title="Ask about this product" />
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line bg-paper py-12 md:py-16">
          <div className={CONTAINER}>
            <h2 className="font-serif text-[clamp(30px,3.6vw,44px)]">More {category.toLowerCase()} products</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} p={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
