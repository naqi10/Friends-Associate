"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitWithKey, uploadDirect } from "@/components/admin/directUpload";
import { Icon } from "@/components/admin/shell/icons";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = /\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i;
// A customer's own files: drawings (PDF, DWG), images and ZIP archives, up to 200 MB.
const BUYER_ACCEPT = ".pdf,.dwg,.jpg,.jpeg,.png,.webp,.zip";
const BUYER_ALLOWED = /\.(pdf|dwg|jpe?g|png|webp|zip)$/i;
const BUYER_MAX_BYTES = 200 * 1024 * 1024;

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

function SubmitButton({ disabled, progress }: { disabled: boolean; progress: number | null }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending || progress !== null} className="w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper hover:bg-body disabled:opacity-50">
      {progress !== null && !pending ? `Uploading… ${progress}%` : pending ? "Saving…" : "Upload"}
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
  fixedBuyer,
}: {
  action: Action;
  types: readonly string[];
  projects: Option[];
  buyers: Option[];
  returnTo: string;
  defaultBuyerId?: string;
  /** On a customer's own page: the file always goes to this buyer, so "Who can see it" is not asked. */
  fixedBuyer?: Option & { confirmed: boolean };
}) {
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState("");
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<"public" | "buyer">(defaultBuyerId || fixedBuyer ? "buyer" : "public");
  const forBuyer = audience === "buyer";
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined | null) {
    if (!f) return;
    if (forBuyer) {
      if (!BUYER_ALLOWED.test(f.name)) return setProblem("Customer files must be PDF, DWG, an image (JPG, PNG, WebP) or ZIP."), setFile(null);
      if (f.size > BUYER_MAX_BYTES) return setProblem("This file is larger than 200 MB."), setFile(null);
    } else {
      if (!ALLOWED.test(f.name)) return setProblem("Upload a PDF, image, Word or Excel file."), setFile(null);
      if (f.size > MAX_BYTES) return setProblem("This file is larger than 15 MB."), setFile(null);
    }
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

  // The file goes straight to storage first (large DWG/ZIP files), then the form is submitted with its key.
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (sent.current || !file || !input.current || !form.current) return;
    e.preventDefault();
    setProblem("");
    setProgress(0);
    const result = await uploadDirect(file, audience, setProgress);
    if (result && "error" in result) {
      setProgress(null);
      setProblem(result.error);
      return;
    }
    sent.current = true;
    if (result) submitWithKey(form.current, input.current, result.key);
    else form.current.requestSubmit();
  }

  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="space-y-5">
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
            <span className="text-sm text-muted">{forBuyer ? "PDF, DWG, JPG, PNG or ZIP · up to 200 MB" : "PDF, JPG, PNG, Word or Excel · up to 15 MB"}</span>
          </>
        )}
        <input ref={input} name="file" type="file" required accept={forBuyer ? BUYER_ACCEPT : ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
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

      {fixedBuyer ? (
        <>
          <input type="hidden" name="audience" value="buyer" />
          <input type="hidden" name="user_id" value={fixedBuyer.id} />
          <p className="flex items-start gap-2 rounded-2xl bg-mist p-3.5 text-sm text-body">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Only <b>{fixedBuyer.name}</b> can see it, in their portal.{" "}
              {fixedBuyer.confirmed
                ? "They get a notification and an email straight away."
                : "It shows there once their booking has its first payment (none yet)."}
            </span>
          </p>
        </>
      ) : (
      <>
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
      </>
      )}
      <SubmitButton disabled={!!problem} progress={progress} />
    </form>
  );
}

function PickLabel({ label, className, progress }: { label: React.ReactNode; className: string; progress: number | null }) {
  const { pending } = useFormStatus();
  const busy = pending || progress !== null;
  return (
    <span className={`${className} ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {progress !== null && !pending ? `Uploading… ${progress}%` : pending ? "Saving…" : label}
    </span>
  );
}

/** A one-click "choose file → upload" form: "+ Attach file" on an empty record, or "Upload new version" / "Replace". */
export function FilePickForm({
  action,
  id,
  returnTo,
  label,
  className,
  audience = "public",
}: {
  action: Action;
  id: string;
  returnTo: string;
  label: React.ReactNode;
  className: string;
  /** "buyer": a customer's file, so DWG and ZIP are allowed (up to 200 MB). */
  audience?: "public" | "buyer";
}) {
  const form = useRef<HTMLFormElement>(null);
  const [problem, setProblem] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const buyer = audience === "buyer";
  const max = buyer ? BUYER_MAX_BYTES : MAX_BYTES;
  return (
    <form ref={form} action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return" value={returnTo} />
      <label className="block cursor-pointer">
        <PickLabel label={label} className={className} progress={progress} />
        <input
          name="file"
          type="file"
          accept={buyer ? BUYER_ACCEPT : ACCEPT}
          className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget;
            const f = input.files?.[0];
            if (!f || !form.current) return;
            if (!(buyer ? BUYER_ALLOWED : ALLOWED).test(f.name) || f.size > max) {
              setProblem(f.size > max ? `Larger than ${buyer ? 200 : 15} MB.` : "Unsupported file type.");
              input.value = "";
              return;
            }
            setProblem("");
            setProgress(0);
            const result = await uploadDirect(f, audience, setProgress);
            if (result && "error" in result) {
              setProgress(null);
              setProblem(result.error);
              input.value = "";
              return;
            }
            if (result) submitWithKey(form.current, input, result.key);
            else form.current.requestSubmit();
          }}
        />
      </label>
      {problem && <span className="mt-1 block text-xs text-red-700">{problem}</span>}
    </form>
  );
}
