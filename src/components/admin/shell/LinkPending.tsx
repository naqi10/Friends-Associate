"use client";

import { useLinkStatus } from "next/link";

/**
 * Put inside a <Link>: shows a small spinner the moment the link is clicked, until the page arrives,
 * so a slow connection never looks like the click did nothing (and nobody clicks twice).
 */
export function LinkPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent transition-opacity ${pending ? "animate-spin opacity-70" : "opacity-0"} ${className}`}
    />
  );
}
