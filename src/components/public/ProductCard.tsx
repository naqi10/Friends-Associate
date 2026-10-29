import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/admin/shell/icons";
import { PRODUCT_CATEGORIES, labelOf } from "@/lib/catalog";
import type { ProductRow } from "@/lib/data";
import { focalPosition, hasRealImage } from "@/lib/media";
import { CARD } from "./ui";

/** "Rs 2,500" / "From Rs 60 per sq ft" / "Call for price". */
export function priceLine(p: ProductRow) {
  if (!p.options.length) return "Call for price";
  const lowest = p.options.reduce((a, b) => (b.pricePkr < a.pricePkr ? b : a));
  return `${p.options.length > 1 ? "From " : ""}Rs ${lowest.pricePkr.toLocaleString("en-PK")}${lowest.unit ? ` ${lowest.unit}` : ""}`;
}

/** Product photo, or a neutral placeholder until a clean product photo is uploaded. */
export function ProductImage({ p, sizes, className = "" }: { p: ProductRow; sizes: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-mist ${className}`}>
      {hasRealImage(p.imagePath) ? (
        <Image src={p.imagePath} alt={p.name} fill sizes={sizes} className="object-cover" style={{ objectPosition: focalPosition(p.imagePath) }} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
          <Icon name="shop" className="h-10 w-10" />
          <span className="mt-2 text-xs">Photo coming soon</span>
        </div>
      )}
    </div>
  );
}

export function ProductCard({ p }: { p: ProductRow }) {
  return (
    <Link href={`/products/${p.slug}`} className={`${CARD} group flex flex-col overflow-hidden transition hover:border-ink`}>
      <ProductImage p={p} sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{labelOf(PRODUCT_CATEGORIES, p.category)}</p>
        <h3 className="mt-1.5 text-[18px] leading-snug font-semibold group-hover:underline">{p.name}</h3>
        {p.summary && <p className="mt-2 line-clamp-2 text-sm text-body">{p.summary}</p>}
        <p className="mt-auto pt-4 text-[17px] font-semibold">{priceLine(p)}</p>
      </div>
    </Link>
  );
}
