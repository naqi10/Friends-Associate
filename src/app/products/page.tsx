import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/public/ProductCard";
import { BTN_DARK, BTN_OUTLINE, CONTAINER, PageHero } from "@/components/public/ui";
import { BRAND } from "@/lib/brand";
import { PRODUCT_CATEGORIES, isKey } from "@/lib/catalog";
import { getCompany, getPageContent, getPublishedProducts } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Construction chemicals & building materials",
  description:
    "Waterproofing kits, DPC membrane, XPS heatproofing sheets, anti-termite chemical, SBR bonding agent, epoxy and construction accessories with prices, from Friends Associates, Rahim Yar Khan.",
  path: "/products",
});

type Props = { searchParams: Promise<{ c?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const { c } = await searchParams;
  const category = isKey(PRODUCT_CATEGORIES, c) ? c : undefined;
  const [all, page, company] = await Promise.all([getPublishedProducts(), getPageContent("page.products"), getCompany()]);
  const products = category ? all.filter((p) => p.category === category) : all;
  const counts = new Map(PRODUCT_CATEGORIES.map((cat) => [cat.key, all.filter((p) => p.category === cat.key).length]));
  const whatsapp = `https://wa.me/${company.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Assalam-o-Alaikum, I want to ask about your construction products.")}`;

  return (
    <>
      <PageHero title={page.title} intro={page.intro} eyebrow="Products" crumbs={[{ href: "/", label: "Home" }, { label: "Products" }]}>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BTN_DARK}>
          Order on WhatsApp
        </a>
        <a href={`tel:${BRAND.phoneIntl.replace(/\s/g, "")}`} className={BTN_OUTLINE}>
          Call {BRAND.phone}
        </a>
      </PageHero>

      <section className="bg-canvas py-12 md:py-16">
        <div className={CONTAINER}>
          <nav aria-label="Product categories" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
            {[{ key: "", label: "All products" }, ...PRODUCT_CATEGORIES].map((cat) => {
              const active = (category ?? "") === cat.key;
              const n = cat.key ? (counts.get(cat.key as (typeof PRODUCT_CATEGORIES)[number]["key"]) ?? 0) : all.length;
              if (cat.key && n === 0) return null;
              return (
                <Link
                  key={cat.key || "all"}
                  href={cat.key ? `/products?c=${cat.key}` : "/products"}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap ${active ? "bg-ink text-paper" : "border border-line bg-paper text-ink hover:border-ink"}`}
                >
                  {cat.label} <span className={active ? "text-faint" : "text-muted"}>{n}</span>
                </Link>
              );
            })}
          </nav>

          {products.length === 0 ? (
            <p className="mt-10 text-center text-body">No products in this category yet.</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
          <p className="mt-10 text-center text-sm text-muted">
            Prices are per the current rate list and may change. Follow the product label for application, dilution, coverage and safety.
          </p>
        </div>
      </section>
    </>
  );
}
