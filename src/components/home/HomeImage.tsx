import Image from "next/image";
import { focalPosition, hasRealImage } from "@/lib/media";

/**
 * Photo area for the black & white design: the uploaded photo when there is one,
 * otherwise the striped placeholder from the reference (light, or dark for the hero).
 * `children` are overlay badges, laid out by the caller.
 */
export function HomeImage({
  src,
  alt,
  dark = false,
  className = "",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  preload = false,
  position,
  children,
}: {
  src?: string | null;
  alt: string;
  dark?: boolean;
  className?: string;
  sizes?: string;
  preload?: boolean;
  /** Fallback CSS object-position for bundled photos; uploaded photos use the focal point found at upload. */
  position?: string;
  children?: React.ReactNode;
}) {
  const real = hasRealImage(src);
  return (
    <div className={`relative overflow-hidden ${real ? "bg-ph" : dark ? "stripes-dark" : "stripes"} ${className}`}>
      {real ? (
        <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" style={{ objectPosition: focalPosition(src, position) }} />
      ) : (
        <span role="img" aria-label={alt} className="absolute inset-0" />
      )}
      {children && <div className="relative flex h-full w-full">{children}</div>}
    </div>
  );
}

/** Renders "*words*" in a heading as the grey italic part of the design. */
export function Emphasis({ text, tone = "text-muted" }: { text: string; tone?: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <em key={i} className={tone}>
            {part.slice(1, -1)}
          </em>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Small text pill used on images and cards. */
export function Pill({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${tone === "dark" ? "bg-ink text-paper" : "bg-paper text-ink"}`}
    >
      {children}
    </span>
  );
}
