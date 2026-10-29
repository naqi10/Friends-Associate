import Image from "next/image";
import Link from "next/link";
import { FormError } from "@/components/FormError";
import { Notice } from "@/components/admin/Field";
import { Icon } from "@/components/admin/shell/icons";
import { setProductPublishedAction } from "@/lib/actions/products";
import { PRODUCT_CATEGORIES } from "@/lib/catalog";
import { getAllProducts } from "@/lib/data";
import { hasRealImage } from "@/lib/media";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Products" };

const SAVED: Record<string, string> = {
  created: "Product added.",
  updated: "Product saved.",
  deleted: "Product deleted.",
  shown: "Product is now shown on the website.",
  hidden: "Product hidden from the website.",
};

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminProductsPage({ searchParams }: Props) {
  await requireAdmin();
  const [sp, products] = await Promise.all([searchParams, getAllProducts()]);

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">Products</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Construction chemicals and building materials on the{" "}
            <Link href="/products" target="_blank" className="text-teal-800 underline">
              Products page
            </Link>
            . {products.filter((p) => p.published).length} shown, {products.filter((p) => !p.published).length} hidden.
          </p>
        </div>
        <Link href="/admin/products/new" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-body">
          Add product
        </Link>
      </div>
      <Notice message={sp.saved ? SAVED[sp.saved] : undefined} />
      <FormError code={sp.error} />

      {PRODUCT_CATEGORIES.map((c) => {
        const list = products.filter((p) => p.category === c.key);
        return (
          <section key={c.key} aria-labelledby={`cat-${c.key}`} className="mt-8">
            <h2 id={`cat-${c.key}`} className="text-lg font-semibold">
              {c.label} <span className="text-sm font-normal text-stone-500">({list.length})</span>
            </h2>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No products in this category yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100 admin-card">
                {list.map((p) => (
                  <li key={p.id} id={`p-${p.id}`} className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist">
                      {hasRealImage(p.imagePath) ? (
                        <Image src={p.imagePath} alt="" fill sizes="56px" className="object-cover" />
                      ) : (
                        <Icon name="shop" className="h-6 w-6 text-stone-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {p.name}
                        {!p.published && <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">Hidden</span>}
                        {!hasRealImage(p.imagePath) && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-800">No photo</span>}
                      </p>
                      <p className="text-xs text-stone-500">
                        {p.options.length
                          ? p.options.map((o) => `${o.label ? `${o.label}: ` : ""}Rs ${o.pricePkr.toLocaleString("en-PK")}${o.unit ? ` ${o.unit}` : ""}`).join(" · ")
                          : "No price (Call for price)"}
                      </p>
                    </div>
                    <form action={setProductPublishedAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="published" value={p.published ? "0" : "1"} />
                      <button type="submit" className="rounded-full border-[1.5px] border-line-strong bg-white px-3 py-1.5 text-xs font-semibold hover:bg-mist">
                        {p.published ? "Hide" : "Show on website"}
                      </button>
                    </form>
                    {p.published && (
                      <Link href={`/products/${p.slug}`} target="_blank" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
                        View ↗
                      </Link>
                    )}
                    <Link href={`/admin/products/${p.id}`} className="text-sm font-medium text-teal-800 hover:underline">
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
