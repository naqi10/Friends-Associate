import Image from "next/image";
import { VisualPlaceholder } from "@/components/VisualPlaceholder";
import { focalPosition, hasRealImage } from "@/lib/media";

/** Uploaded photo when one exists, otherwise a decorative placeholder of the same size. */
export function CoverImage({
  src,
  alt,
  className = "h-44",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  preload = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  preload?: boolean;
}) {
  if (!hasRealImage(src)) return <VisualPlaceholder className={`w-full ${className}`} />;
  return (
    <div className={`relative w-full overflow-hidden bg-ph ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" style={{ objectPosition: focalPosition(src) }} />
    </div>
  );
}
