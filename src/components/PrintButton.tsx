"use client";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-body print:hidden"
    >
      {label}
    </button>
  );
}
