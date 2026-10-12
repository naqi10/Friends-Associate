"use client";

export function ResetPermissionsButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Replace all Visitor, Buyer, Sales and Project manager permissions with the defaults?")) e.preventDefault();
      }}
    >
      <button type="submit" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white">
        Reset to defaults
      </button>
    </form>
  );
}
