import { ConfirmButton } from "@/components/admin/ConfirmButton";

/** "Reset to defaults" with the same small confirm card as the rest of admin. */
export function ResetPermissionsButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <ConfirmButton
        tone="neutral"
        title="Reset to defaults?"
        confirmLabel="Reset"
        message="Replace all Visitor, Buyer, Sales and Project manager permissions with the original defaults. Admin is not affected."
        className="px-6 py-3 text-[15px]"
      >
        Reset to defaults
      </ConfirmButton>
    </form>
  );
}
