"use client";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-full bg-ink px-5 py-2 text-[15px] font-semibold text-paper hover:bg-body print:hidden"
    >
      {label}
    </button>
  );
}
