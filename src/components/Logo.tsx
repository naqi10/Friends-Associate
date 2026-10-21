import Image from "next/image";
import { BRAND } from "@/lib/brand";

/**
 * The FARYK logo (public/brand). The symbol is a vector redrawn from the designer's PNG; the full logo with words is the PNG.
 * - `mark`: the F + house symbol only, for tight spaces next to the company name.
 * - `full`: symbol + FARYK.COM + "Architecture | Construction | Real estate".
 * Use `light` on dark backgrounds: the navy parts become white, the gold stays.
 */
export function Logo({
  variant = "mark",
  light = false,
  className = "",
  priority = false,
  decorative = false,
}: {
  variant?: "mark" | "full";
  light?: boolean;
  className?: string;
  priority?: boolean;
  /** True when the company name is already written next to it, so screen readers do not hear it twice. */
  decorative?: boolean;
}) {
  const full = variant === "full";
  const alt = decorative ? "" : `${BRAND.name} — ${BRAND.domain}`;
  if (!full) {
    // The symbol is a true vector (public/brand/mark.svg): sharp at every size, about 1 KB.
    return (
      <Image src={`/brand/mark${light ? "-light" : ""}.svg`} alt={alt} width={472} height={391} priority={priority} unoptimized className={`h-auto ${className}`} />
    );
  }
  return (
    <Image src={`/brand/logo${light ? "-light" : ""}.png`} alt={alt} width={1200} height={669} priority={priority} sizes="320px" className={`h-auto ${className}`} />
  );
}
