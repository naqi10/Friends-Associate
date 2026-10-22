"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Role = { key: string; label: string; scope: string };

const field = "mt-1.5 w-full rounded-2xl border-[1.5px] border-line-strong bg-white px-4 py-3 text-[15px] outline-none focus:border-ink";

/** Letters and digits without look-alikes (0/O, 1/l/I), always at least one of each. */
function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(letters), pick(digits), ...Array.from({ length: 10 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper hover:bg-body disabled:opacity-60">
      {pending ? "Creating…" : "Create account"}
    </button>
  );
}

/** Staff page → "Add staff member": creates the login with a temporary password the admin shares privately. */
export function StaffAddPanel({ action, roles, cities }: { action: (formData: FormData) => Promise<void>; roles: Role[]; cities: readonly string[] }) {
  const [role, setRole] = useState("sales");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value="list" />
      <input type="hidden" name="phone" value="" />
      {/* The server checks password + confirm; the admin sees the password, so confirm mirrors it. */}
      <input type="hidden" name="confirm" value={password} />
      <label className="block text-sm font-medium text-body">
        Full name
        <input name="name" required minLength={2} maxLength={120} autoComplete="off" placeholder="e.g. Ayesha Khan" className={field} />
      </label>
      <label className="block text-sm font-medium text-body">
        Work email
        <input name="email" type="email" required autoComplete="off" placeholder="name@faryk.com" className={field} />
      </label>
      <label className="block text-sm font-medium text-body">
        City
        <select name="city" required defaultValue={cities[0]} className={field}>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-body">Role</legend>
        <div className="mt-1.5 space-y-2.5">
          {roles.map((r) => (
            <label key={r.key} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-[1.5px] px-4 py-3.5 ${role === r.key ? "border-ink ring-1 ring-ink" : "border-line-strong hover:border-ink"}`}>
              <input type="radio" name="role" value={r.key} checked={role === r.key} onChange={() => setRole(r.key)} className="h-5 w-5 accent-ink" />
              <span>
                <span className="block text-[15px] font-semibold">{r.label}</span>
                <span className="block text-sm text-muted">{r.scope}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="staff-temp-password" className="text-sm font-medium text-body">
          Temporary password
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="staff-temp-password"
            name="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setCopied(false);
            }}
            autoComplete="new-password"
            spellCheck={false}
            className={`${field} mt-0 font-mono`}
          />
          <button
            type="button"
            onClick={() => {
              setPassword(generatePassword());
              setCopied(false);
            }}
            className="shrink-0 rounded-full border-[1.5px] border-line-strong px-4 text-sm font-semibold hover:bg-mist"
          >
            Generate
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted">
          <span>At least 10 characters with a letter and a number.</span>
          {password && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(password);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="shrink-0 font-semibold text-teal-800 underline underline-offset-4"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>
      <Submit />
      <p className="text-center text-sm text-muted">Share the email and password privately. They change the password under My account after signing in.</p>
    </form>
  );
}
