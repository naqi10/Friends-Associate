import Link from "next/link";

/** "Active / Archived (n)" switch above admin lists that support archiving. */
export function ArchiveTabs({ base, archived, archivedCount }: { base: string; archived: boolean; archivedCount: number }) {
  const tab = (active: boolean) =>
    `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-teal-800 text-teal-900" : "border-transparent text-stone-600 hover:text-stone-900"}`;
  return (
    <nav aria-label="Show active or archived" className="mt-4 flex gap-1 border-b border-stone-200">
      <Link href={base} aria-current={!archived ? "page" : undefined} className={tab(!archived)}>
        Active
      </Link>
      <Link href={`${base}?archived=1`} aria-current={archived ? "page" : undefined} className={tab(archived)}>
        Archived ({archivedCount})
      </Link>
    </nav>
  );
}
