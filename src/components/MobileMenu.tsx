"use client";

import { useEffect, useRef } from "react";

/**
 * The mobile "Menu" disclosure. Still a native <details>, so it opens without JavaScript; once loaded it also
 * closes when a link inside is tapped, when tapping anywhere outside it, and on Escape.
 */
export function MobileMenu({ summary, children, className }: { summary: React.ReactNode; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      if (ref.current?.open) ref.current.open = false;
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details
      ref={ref}
      className={className}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) ref.current!.open = false;
      }}
    >
      {summary}
      {children}
    </details>
  );
}
