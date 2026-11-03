"use client";

import { useEffect } from "react";

/**
 * Site-wide form helpers, mounted once in the root layout:
 *
 * 1. Keeps what was typed when a save fails. Server actions answer a bad form by redirecting back with
 *    ?error=<code>, and React resets the form, so everything typed was lost. Before each POST we copy the
 *    form's values to sessionStorage; if the page comes back with ?error=, we put them back and mark the
 *    field the error is about. Passwords and files are never stored. Hidden inputs are only kept when
 *    they carry data-keep (e.g. the value behind a searchable dropdown).
 * 2. Number fields ignore the mouse wheel, so scrolling the page never changes a price by accident.
 */

const KEY = "faryk:form-keep";
const MAX_AGE_MS = 10 * 60 * 1000;
const WATCH_MS = 20_000;

type Saved = { path: string; sig: string; at: number; fields: { name: string; type: string; value: string; checked: boolean }[] };

/** Which field an error code is about (first match in the form wins). "required" means the first empty required field. */
const ERROR_FIELDS: Record<string, string[]> = {
  phone: ["phone"],
  email: ["email"],
  "email-taken": ["email"],
  username: ["username"],
  "username-taken": ["username"],
  "login-needed": ["username", "email"],
  name: ["name"],
  city: ["city"],
  cnic: ["cnic"],
  password: ["password"],
  "password-match": ["confirm"],
  same: ["password"],
  current: ["current"],
  slug: ["slug"],
  "slug-taken": ["slug"],
  price: ["price_pkr", "price"],
  amount: ["amount_pkr", "amount"],
  overpaid: ["paid_pkr"],
  "payments-permission": ["paid_pkr"],
  date: ["booked_on", "next_payment_date", "date"],
  "payment-date": ["paid_on"],
  reference: ["reference_number"],
  method: ["method"],
  buyer: ["user_id"],
  "booking-buyer": ["user_id"],
  property: ["property_id"],
  "doc-type": ["category"],
  "buyer-type": ["file"],
  "receipt-type": ["file"],
  type: ["file"],
  size: ["file"],
  "product-price": ["options"],
  "cancel-reason": ["reason"],
  "reversal-reason": ["reason"],
  note: ["note"],
  guarantee: ["returns_note"],
  "reviewed-date": ["figures_reviewed_on", "reviewed_on"],
  investment: ["investmentId"],
  link: ["cta_url", "button_url"],
  cta: ["cta_text", "cta_url"],
  "image-size": ["image"],
  "image-type": ["image"],
};

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// "$ACTION_…" inputs are Next.js internals that exist only in the first server-rendered HTML: never part of the form's identity.
const fieldsOf = (form: HTMLFormElement) =>
  [...form.elements].filter(
    (el): el is Field => (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) && !!el.name && !el.name.startsWith("$ACTION"),
  );

const keepable = (el: Field) => {
  if (el instanceof HTMLInputElement) {
    if (el.type === "password" || el.type === "file" || el.type === "submit" || el.type === "button") return false;
    if (el.type === "hidden") return el.hasAttribute("data-keep");
  }
  return true;
};

/** Identifies "the same form" after the page re-renders: the names of all its fields. */
const signature = (form: HTMLFormElement) => [...new Set(fieldsOf(form).map((f) => f.name))].sort().join("|");

function read(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Saved) : null;
    return saved && Date.now() - saved.at < MAX_AGE_MS ? saved : null;
  } catch {
    return null;
  }
}

function clear() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

/** Sets a value so React-controlled inputs see it too (they ignore a plain .value assignment). */
function setValue(el: Field, value: string) {
  if (el.value === value) return;
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/** True when the form on the page no longer shows what was typed (it was reset or re-rendered). */
function differs(form: HTMLFormElement, saved: Saved) {
  const els = fieldsOf(form).filter(keepable);
  return saved.fields.some((f, i) => {
    const el = els.filter((e) => e.name === f.name)[saved.fields.filter((g, j) => j < i && g.name === f.name).length];
    if (!el) return false;
    return el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? el.checked !== f.checked : el.value !== f.value;
  });
}

function restore(form: HTMLFormElement, saved: Saved) {
  const els = fieldsOf(form).filter(keepable);
  const seen: Record<string, number> = {};
  for (const f of saved.fields) {
    const n = (seen[f.name] = (seen[f.name] ?? -1) + 1);
    const el = els.filter((e) => e.name === f.name)[n];
    if (!el) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      if (el.checked !== f.checked) el.click();
    } else {
      setValue(el, f.value);
    }
  }
  form.dispatchEvent(new CustomEvent("formkeep:restored", { bubbles: true }));
}

function markError(form: HTMLFormElement, code: string) {
  form.querySelectorAll("[data-field-error]").forEach((el) => el.removeAttribute("data-field-error"));
  const fields = fieldsOf(form).filter((f) => !(f instanceof HTMLInputElement && f.type === "hidden"));
  let target: Field | undefined;
  if (code === "required") target = fields.find((f) => f.required && !f.value.trim());
  else for (const name of ERROR_FIELDS[code] ?? [code]) if ((target = fields.find((f) => f.name === name))) break;
  if (!target) return;
  // A searchable dropdown shows its text box; mark that rather than the hidden value.
  const shown = (target.closest("[data-combobox]")?.querySelector("input[type=text]") as Field | null) ?? target;
  shown.setAttribute("data-field-error", "");
  shown.addEventListener("input", () => shown.removeAttribute("data-field-error"), { once: true });
  shown.scrollIntoView({ block: "center" });
  shown.focus({ preventScroll: true });
}

function matchingForm(saved: Saved) {
  return [...document.querySelectorAll("form")].find((f) => signature(f) === saved.sig);
}

export function FormHelpers() {
  useEffect(() => {
    let timer: number | undefined;

    /** After a submit (or on load), wait for the answer: an ?error= page gets the values back. */
    const watch = () => {
      window.clearInterval(timer);
      const started = Date.now();
      const from = location.href;
      timer = window.setInterval(() => {
        const saved = read();
        if (!saved || Date.now() - started > WATCH_MS) return window.clearInterval(timer);
        const url = new URL(location.href);
        const code = url.searchParams.get("error");
        if (!code) {
          // Saved fine (or the visitor went elsewhere): forget the copy.
          if (location.href !== from || url.pathname !== saved.path) {
            clear();
            window.clearInterval(timer);
          }
          return;
        }
        if (url.pathname !== saved.path) return;
        const form = matchingForm(saved);
        if (!form) return;
        if (location.href === from && !differs(form, saved)) return; // still waiting for the answer
        restore(form, saved);
        markError(form, code);
        // React resets the form once its action settles, which can land just after this; fill it again then.
        // Only a reset does this, so whatever the person types next is never overwritten.
        const again = () => window.setTimeout(() => restore(form, saved), 0);
        form.addEventListener("reset", again);
        window.setTimeout(() => form.removeEventListener("reset", again), 3000);
        clear();
        window.clearInterval(timer);
      }, 120);
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "post" || form.hasAttribute("data-no-keep")) return;
      const fields = fieldsOf(form)
        .filter(keepable)
        .map((el) => ({ name: el.name, type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(), value: el.value, checked: el instanceof HTMLInputElement && el.checked }));
      if (!fields.some((f) => f.type !== "hidden")) return; // a one-button form (Hide, Delete…): nothing to keep
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ path: location.pathname, sig: signature(form), at: Date.now(), fields } satisfies Saved));
      } catch {
        return;
      }
      watch();
    };

    const onWheel = (e: WheelEvent) => {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.type === "number" && el === document.activeElement) el.blur();
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("wheel", onWheel, { passive: true });
    if (read()) watch();
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("wheel", onWheel);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
