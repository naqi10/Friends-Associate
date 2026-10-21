/**
 * Shown where a project or property has no photo yet: the design's striped tile with a small building mark.
 * Purely decorative (aria-hidden): the card's own title already names the item, so screen readers hear it once.
 */
export function VisualPlaceholder({ className = "", dark = false }: { className?: string; dark?: boolean; label?: string }) {
  return (
    <div aria-hidden className={`flex flex-col items-center justify-center gap-2 ${dark ? "stripes-dark text-quiet" : "stripes text-star"} ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01" />
      </svg>
      <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase ${dark ? "text-quiet" : "text-muted"}`}>Photo coming soon</span>
    </div>
  );
}
