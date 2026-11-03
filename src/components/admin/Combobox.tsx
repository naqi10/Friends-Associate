"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/** `hint` is shown under the label and searched too (phone, user ID…); `tags` are what the filter chips match. */
export type ComboOption = { value: string; label: string; hint?: string; tags?: readonly string[] };

const MAX_SHOWN = 60;

/**
 * A dropdown you can type into: the list narrows to what matches (name, phone, user ID…), arrow keys and
 * Enter pick, Escape closes. The chosen value travels in a hidden input named `name`, so server actions
 * read it exactly like a <select>.
 *
 * - `creatable`: whatever is typed is accepted as the value (e.g. a city that is not in the list).
 * - `createName`: typing a name that is not in the list sends it in this extra field and leaves `name`
 *   empty (e.g. a new project: project_id="" and new_project="Gulshan Homes").
 * - `filters`: chips above the list that narrow it to options carrying that tag (e.g. property type).
 */
export function Combobox({
  label,
  name,
  options,
  defaultValue = "",
  required,
  placeholder = "Type to search…",
  hint,
  creatable,
  createName,
  filters,
  emptyLabel,
  labelClassName = "font-medium text-stone-700",
}: {
  label: string;
  name: string;
  options: ComboOption[];
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  creatable?: boolean;
  createName?: string;
  filters?: readonly string[];
  /** An option for "none" (value ""), shown first, e.g. "Standalone listing". */
  emptyLabel?: string;
  labelClassName?: string;
}) {
  const id = useId();
  const all = useMemo(() => (emptyLabel ? [{ value: "", label: emptyLabel }, ...options] : options), [options, emptyLabel]);
  const labelOf = (v: string) => all.find((o) => o.value === v)?.label ?? (creatable ? v : "");

  const [value, setValue] = useState(defaultValue);
  const [created, setCreated] = useState("");
  const [text, setText] = useState(() => labelOf(defaultValue));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [tag, setTag] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const textNow = useRef(text);
  useEffect(() => {
    textNow.current = text;
  }, [text]);

  const term = text.trim().toLowerCase();
  const typing = term !== labelOf(value).toLowerCase();
  const matches = all.filter(
    (o) => (!tag || o.tags?.includes(tag) || o.value === "") && (!typing || `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(term)),
  );
  const exact = all.some((o) => o.label.toLowerCase() === term);
  const offerCreate = (creatable || createName) && term && !exact;

  // Browser check for required: the hidden input cannot carry it, so the text box does.
  useEffect(() => {
    input.current?.setCustomValidity(required && !value && !created ? `Choose ${label.toLowerCase()} from the list.` : "");
  }, [required, value, created, label]);

  // FormHelpers puts typed values back after a failed save; show the matching label again.
  useEffect(() => {
    const form = hidden.current?.form;
    if (!form) return;
    const sync = () => {
      const v = hidden.current?.value ?? "";
      const c = (form.elements.namedItem(createName ?? "") as HTMLInputElement | null)?.value ?? "";
      setValue(v);
      setCreated(c);
      setText(c || labelOf(v));
    };
    // A form reset puts the text box back to its first text while our state stays: show the state again.
    const reset = () => window.setTimeout(() => input.current && (input.current.value = textNow.current), 0);
    form.addEventListener("formkeep:restored", sync);
    form.addEventListener("reset", reset);
    return () => {
      form.removeEventListener("formkeep:restored", sync);
      form.removeEventListener("reset", reset);
    };
  });

  /** Typing: the list narrows; a creatable field takes the text as its value straight away (no need to pick). */
  function typed(t: string) {
    setText(t);
    setOpen(true);
    setActive(0);
    const exactOption = all.find((o) => o.label.toLowerCase() === t.trim().toLowerCase());
    if (exactOption) {
      setValue(exactOption.value);
      setCreated("");
    } else if (createName) {
      setValue("");
      setCreated(t.trim());
    } else if (creatable) {
      setValue(t.trim());
    } else if (!t.trim()) {
      setValue("");
    }
  }

  function choose(o: ComboOption) {
    setValue(o.value);
    setCreated("");
    setText(o.label);
    setOpen(false);
  }

  function create() {
    const t = text.trim();
    if (createName) {
      setValue("");
      setCreated(t);
    } else {
      setValue(t);
    }
    setText(t);
    setOpen(false);
  }

  function close() {
    setOpen(false);
    if (offerCreate && creatable && !createName) return create();
    if (!created) setText(labelOf(value));
  }

  // Close when clicking elsewhere; a half-typed search falls back to the chosen value.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  });

  function onKey(e: React.KeyboardEvent) {
    const count = Math.min(matches.length, MAX_SHOWN) + (offerCreate ? 1 : 0);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (count ? (a + (e.key === "ArrowDown" ? 1 : count - 1)) % count : 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (active < Math.min(matches.length, MAX_SHOWN)) choose(matches[active]);
      else if (offerCreate) create();
    } else if (e.key === "Escape") {
      close();
    }
  }

  const shown = matches.slice(0, MAX_SHOWN);
  return (
    <div ref={box} className="relative block text-sm" data-combobox>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {filters && (
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`Filter ${label.toLowerCase()}`}>
          {["", ...filters].map((f) => (
            <button
              key={f || "all"}
              type="button"
              onClick={() => {
                setTag(f);
                setOpen(true);
                input.current?.focus();
              }}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tag === f ? "border-ink bg-ink text-paper" : "border-line-strong bg-white text-body hover:border-ink"}`}
            >
              {f || "All"}
            </button>
          ))}
        </div>
      )}
      <div className="relative mt-1">
        <input
          ref={input}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => typed(e.target.value)}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onKeyDown={onKey}
          className="w-full rounded-xl border border-line-strong bg-white py-2.5 pr-9 pl-3.5 focus:border-ink focus:ring-2 focus:ring-ink/10 focus:outline-none"
        />
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-muted">
          ▾
        </span>
      </div>
      <input ref={hidden} type="hidden" name={name} value={value} data-keep />
      {createName && <input type="hidden" name={createName} value={created} data-keep />}
      {created && !open && <span className="mt-1 block text-xs font-medium text-teal-800">New: “{created}” will be added when you save.</span>}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-[0_18px_40px_-18px_rgb(14_14_14/0.35)]"
        >
          {shown.map((o, i) => (
            <li
              key={o.value || "none"}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3.5 py-2 ${i === active ? "bg-mist" : ""} ${o.value === value ? "font-semibold" : ""}`}
            >
              {o.label}
              {o.hint && <span className="block text-xs font-normal text-muted">{o.hint}</span>}
            </li>
          ))}
          {matches.length > MAX_SHOWN && <li className="px-3.5 py-2 text-xs text-muted">{matches.length - MAX_SHOWN} more… keep typing to narrow the list.</li>}
          {offerCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={create}
              onMouseEnter={() => setActive(shown.length)}
              className={`cursor-pointer border-t border-line px-3.5 py-2 font-medium text-teal-800 ${active === shown.length ? "bg-mist" : ""}`}
            >
              + Add “{text.trim()}”
            </li>
          )}
          {shown.length === 0 && !offerCreate && <li className="px-3.5 py-2 text-muted">Nothing matches “{text.trim()}”.</li>}
        </ul>
      )}
    </div>
  );
}
