import { setDocumentVisibilityAction } from "@/lib/actions/documents";

/**
 * The "Visible to customer" checkbox of an uploaded file. One click saves: unticking hides the file from the
 * customer's portal (or the website for a public file), ticking shows it and tells the customer.
 */
export function VisibilityToggle({
  id,
  hidden,
  audience,
  returnTo,
  className = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-mist",
}: {
  id: string;
  hidden: boolean;
  audience: string;
  returnTo: string;
  className?: string;
}) {
  const who = audience === "public" ? "Visible on website" : "Visible to customer";
  return (
    <form action={setDocumentVisibilityAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return" value={returnTo} />
      <input type="hidden" name="visible" value={hidden ? "1" : "0"} />
      <button type="submit" role="checkbox" aria-checked={!hidden} title={hidden ? "Click to show it" : "Click to hide it"} className={className}>
        <span
          aria-hidden
          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-[1.5px] text-[11px] leading-none font-bold ${hidden ? "border-line-strong bg-white" : "border-teal-700 bg-teal-700 text-white"}`}
        >
          {hidden ? "" : "✓"}
        </span>
        {who}
      </button>
    </form>
  );
}

/** "Hidden" pill next to a file the customer (or the website) does not see yet. */
export function HiddenPill() {
  return <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-700">Hidden</span>;
}
