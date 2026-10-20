"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/admin/shell/icons";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = /\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i;

type Option = { id: string; name: string };
type Action = (formData: FormData) => Promise<void>;

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "Lahore_master-plan_v2.pdf" → "Lahore master plan v2" as a starting display name. */
function nameFromFile(file: string) {
  return file
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper hover:bg-body disabled:opacity-50">
      {pending ? "Uploading…" : "Upload"}
    </button>
  );
}

const field = "mt-1.5 w-full rounded-2xl border-[1.5px] border-line-strong bg-white px-4 py-3 text-[15px] outline-none focus:border-ink";

/** Admin → Documents "Upload a document" panel: drag & drop or browse, then name, type, project and audience. */
export function DocumentUpload({
  action,
  types,
  projects,
  buyers,
  returnTo,
  defaultBuyerId,
}: {
  action: Action;
  types: readonly string[];
  projects: Option[];
  buyers: Option[];
  returnTo: string;
  defaultBuyerId?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState("");
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<"public" | "buyer">(defaultBuyerId ? "buyer" : "public");
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined | null) {
    if (!f) return;
    if (!ALLOWED.test(f.name)) return setProblem("Upload a PDF, image, Word or Excel file."), setFile(null);
    if (f.size > MAX_BYTES) return setProblem("This file is larger than 15 MB."), setFile(null);
    setProblem("");
    setFile(f);
    if (!name) setName(nameFromFile(f.name));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f || !input.current) return;
    // Put the dropped file into the real input so the form submits it.
    const dt = new DataTransfer();
    dt.items.add(f);
    input.current.files = dt.files;
    pick(f);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="return" value={returnTo} />
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center rounded-[22px] border-2 border-dashed px-5 py-8 text-center transition ${dragging ? "border-teal-700 bg-teal-50" : "border-line-strong bg-paper hover:border-ink"}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon name="upload" className="h-5 w-5" />
        </span>
        {file ? (
          <>
            <span className="mt-3 max-w-full truncate text-[15px] font-semibold">{file.name}</span>
            <span className="text-sm text-muted">{sizeLabel(file.size)} · click to choose another</span>
          </>
        ) : (
          <>
            <span className="mt-3 text-[15px] font-semibold">Drop a file here or browse</span>
            <span className="text-sm text-muted">PDF, JPG or PNG · up to 15 MB</span>
          </>
        )}
        <input ref={input} name="file" type="file" required accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {problem && <p className="text-sm text-red-700">{problem}</p>}

      <label className="block text-sm font-semibold">
        Display name
        <input name="name" required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lahore master plan" className={field} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 min-[1500px]:grid-cols-2">
        <label className="block text-sm font-semibold">
          Type
          <select name="category" required defaultValue="" className={field}>
            <option value="" disabled>
              Choose…
            </option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Project
          <select name="project_id" defaultValue="" className={field}>
            <option value="">None (company-wide)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Who can see it</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          {(
            [
              { v: "public", t: "Everyone", d: "Shown on the website" },
              { v: "buyer", t: "One buyer", d: "Only in their portal" },
            ] as const
          ).map((o) => (
            <label key={o.v} className={`cursor-pointer rounded-2xl border-[1.5px] p-4 ${audience === o.v ? "border-ink bg-white ring-1 ring-ink" : "border-line-strong bg-white hover:border-ink"}`}>
              <input type="radio" name="audience" value={o.v} checked={audience === o.v} onChange={() => setAudience(o.v)} className="sr-only" />
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <Icon name={o.v === "public" ? "globe" : "lock"} className="h-4.5 w-4.5" /> {o.t}
              </span>
              <span className="mt-1 block text-sm text-muted">{o.d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {audience === "buyer" && (
        <label className="block text-sm font-semibold">
          Buyer
          <select name="user_id" required defaultValue={defaultBuyerId ?? ""} className={field}>
            <option value="" disabled>
              Choose the buyer…
            </option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-muted">The buyer gets a notification in their portal.</span>
        </label>
      )}
      <SubmitButton disabled={!!problem} />
    </form>
  );
}

function PickLabel({ label, className }: { label: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return <span className={`${className} ${pending ? "pointer-events-none opacity-60" : ""}`}>{pending ? "Uploading…" : label}</span>;
}

/** A one-click "choose file → upload" form: "+ Attach file" on an empty record, or "Upload new version". */
export function FilePickForm({ action, id, returnTo, label, className }: { action: Action; id: string; returnTo: string; label: React.ReactNode; className: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [problem, setProblem] = useState("");
  return (
    <form ref={form} action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return" value={returnTo} />
      <label className="block cursor-pointer">
        <PickLabel label={label} className={className} />
        <input
          name="file"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!ALLOWED.test(f.name) || f.size > MAX_BYTES) {
              setProblem(f.size > MAX_BYTES ? "Larger than 15 MB." : "Unsupported file type.");
              e.target.value = "";
              return;
            }
            setProblem("");
            form.current?.requestSubmit();
          }}
        />
      </label>
      {problem && <span className="mt-1 block text-xs text-red-700">{problem}</span>}
    </form>
  );
}
