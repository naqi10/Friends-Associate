"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { VisualPlaceholder } from "@/components/VisualPlaceholder";
import { focalPosition } from "@/lib/media";

/**
 * Several photos of one listing or product: swipe sideways on a phone (like an Instagram post with several
 * pictures), arrows on a computer, dots and "2 / 5" to show where you are. One photo shows as a plain image.
 */
export function PhotoCarousel({ photos, alt, className = "", sizes, preload = false }: { photos: string[]; alt: string; className?: string; sizes: string; preload?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return <VisualPlaceholder className={`w-full ${className}`} />;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  const many = photos.length > 1;
  const arrow =
    "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-ink shadow-md hover:bg-white disabled:opacity-0 md:flex";

  return (
    <div
      className={`relative w-full overflow-hidden bg-ph ${className}`}
      role={many ? "region" : undefined}
      aria-roledescription={many ? "carousel" : undefined}
      aria-label={many ? `${alt}: ${photos.length} photos` : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div
        ref={track}
        tabIndex={many ? 0 : -1}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center" aria-roledescription={many ? "slide" : undefined} aria-label={many ? `${i + 1} of ${photos.length}` : undefined}>
            <Image src={src} alt={i === 0 ? alt : `${alt}, photo ${i + 1}`} fill sizes={sizes} preload={preload && i === 0} className="object-cover" style={{ objectPosition: focalPosition(src) }} />
          </div>
        ))}
      </div>
      {many && (
        <>
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo" className={`${arrow} left-3`}>
            ‹
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === photos.length - 1} aria-label="Next photo" className={`${arrow} right-3`}>
            ›
          </button>
          <span className="absolute top-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-paper">
            {index + 1} / {photos.length}
          </span>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-2 bg-white/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
