"use client";

/**
 * Submit button that asks "Are you sure?" first. The server action still re-checks permissions;
 * this only protects against an accidental click.
 */
export function ConfirmButton({
  message,
  children,
  className = "",
  tone = "danger",
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  tone?: "danger" | "neutral";
}) {
  const colours =
    tone === "danger" ? "bg-red-700 text-white hover:bg-red-800" : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50";
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={`rounded-md px-4 py-2 text-sm font-medium ${colours} ${className}`}
    >
      {children}
    </button>
  );
}
