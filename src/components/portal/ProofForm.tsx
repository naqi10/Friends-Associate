"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/admin/shell/icons";
import { sendPaymentProofAction } from "@/lib/actions/portal";

const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const ALLOWED = /\.(pdf|jpe?g|png)$/i;
const MAX_BYTES = 10 * 1024 * 1024;
const FIELD = "mt-1.5 w-full rounded-2xl border-[1.5px] border-line-strong bg-paper px-4 py-3 text-[16px] outline-none focus:border-ink";

function Send({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="min-h-12 w-full rounded-full bg-ink px-6 text-[16px] font-semibold text-paper hover:bg-body disabled:opacity-50 sm:w-auto">
      {pending ? "Sending…" : "Send receipt"}
    </button>
  );
}

/** "Already paid? Send the receipt": a photo or PDF of the bank slip / cheque, with the amount and date. */
export function ProofForm({ bookings, today, open: startOpen }: { bookings: { id: string; title: string }[]; today: string; open: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState("");

  return (
    <div className="rounded-[24px] border-2 border-dashed border-line-strong bg-paper">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-4 p-5 text-left sm:p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
          <Icon name="upload" className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[18px] font-semibold">Already paid? Send the receipt</span>
          <span className="block text-[15px] text-muted">Photo or PDF · our team updates your balance</span>
        </span>
        <Icon name="chevron" className={`h-5 w-5 shrink-0 transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <form action={sendPaymentProofAction} className="space-y-4 border-t border-line p-5 sm:p-6">
          <label className={`flex cursor-pointer flex-col items-center rounded-[18px] border-[1.5px] px-4 py-6 text-center ${file ? "border-ink bg-mist" : "border-line-strong bg-canvas hover:border-ink"}`}>
            <Icon name={file ? "check" : "receipt"} className="h-7 w-7" />
            <span className="mt-2 max-w-full truncate text-[16px] font-semibold">{file ? file.name : "Choose a photo or PDF"}</span>
            <span className="text-[14px] text-muted">{file ? "Tap to choose another" : "PDF, JPG or PNG · up to 10 MB"}</span>
            <input
              name="file"
              type="file"
              required
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && !ALLOWED.test(f.name)) {
                  setProblem("Please send a PDF, JPG or PNG file.");
                  setFile(null);
                  e.target.value = "";
                  return;
                }
                if (f && f.size > MAX_BYTES) {
                  setProblem("This file is larger than 10 MB. Please send a smaller photo.");
                  setFile(null);
                  e.target.value = "";
                  return;
                }
                setProblem("");
                setFile(f);
              }}
            />
          </label>
          {problem && <p className="text-[15px] text-red-700">{problem}</p>}

          {bookings.length > 1 && (
            <label className="block text-[15px] font-semibold">
              For which property?
              <select name="booking_id" required defaultValue="" className={FIELD}>
                <option value="" disabled>
                  Choose…
                </option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {bookings.length === 1 && <input type="hidden" name="booking_id" value={bookings[0].id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[15px] font-semibold">
              Amount paid (PKR) <span className="font-normal text-muted">· optional</span>
              <input name="amount" inputMode="numeric" pattern="[0-9,]*" placeholder="e.g. 1,387,500" className={FIELD} />
            </label>
            <label className="block text-[15px] font-semibold">
              Date paid
              <input name="paid_on" type="date" max={today} defaultValue={today} className={FIELD} />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Send disabled={!file} />
            <p className="text-[14px] text-muted">We check it and add it to your payment history, usually within one working day.</p>
          </div>
        </form>
      )}
    </div>
  );
}
