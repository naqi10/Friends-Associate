import { setDocumentNoteAction } from "@/lib/actions/documents";

/** "Edit caption…" for a file: the short note shown under its name (to the customer too, for their files). */
export function CaptionForm({ id, note, returnTo, className = "block rounded-xl px-3 py-2 hover:bg-mist" }: { id: string; note: string; returnTo: string; className?: string }) {
  return (
    <details>
      <summary className={`cursor-pointer list-none ${className}`}>{note ? "Edit caption…" : "Add caption…"}</summary>
      <form action={setDocumentNoteAction} className="space-y-2 px-3 pt-1 pb-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="return" value={returnTo} />
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={note}
          aria-label="Caption"
          placeholder="What is this file?"
          className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper hover:bg-body">
          Save caption
        </button>
      </form>
    </details>
  );
}
