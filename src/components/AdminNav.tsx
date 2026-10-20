/** Shown when a staff member was sent back from a page their role cannot open. (The staff menu lives in components/admin/shell.) */
export function DeniedNotice({ denied }: { denied?: string }) {
  if (denied !== "1") return null;
  return (
    <p role="alert" className="mb-6 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
      You do not have permission to access that page. Ask an administrator if you need it.
    </p>
  );
}
