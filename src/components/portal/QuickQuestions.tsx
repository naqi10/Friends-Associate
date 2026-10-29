"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { portalRequestAction } from "@/lib/actions/portal";

export type QuickAnswer = { q: string; a: string; href?: string; link?: string };

const CHIP = "min-h-11 rounded-full bg-paper px-4 py-2 text-left text-[15px] text-ink shadow-[0_1px_0_rgb(14_14_14/0.04)] ring-1 ring-line hover:ring-ink";

function CallbackChip({ sent }: { sent: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || sent} className={`${CHIP} disabled:opacity-70`}>
      {sent ? "Callback requested ✓" : pending ? "Sending…" : "Request a callback"}
    </button>
  );
}

/** Tappable questions answered from the customer's own records, plus a one-tap callback request. */
export function QuickQuestions({ answers, returnTo, callbackSent }: { answers: QuickAnswer[]; returnTo: string; callbackSent: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : answers[open];
  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {answers.map((x, i) => (
          <button key={x.q} type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className={`${CHIP} ${open === i ? "ring-2 ring-ink" : ""}`}>
            {x.q}
          </button>
        ))}
        <form action={portalRequestAction}>
          <input type="hidden" name="kind" value="callback" />
          <input type="hidden" name="return" value={returnTo} />
          <CallbackChip sent={callbackSent} />
        </form>
      </div>
      {current && (
        <div role="status" className="mt-4 rounded-[18px] bg-paper p-4 text-[15px] leading-relaxed ring-1 ring-line">
          <p className="whitespace-pre-line">{current.a}</p>
          {current.href && (
            <Link href={current.href} className="mt-2 inline-block font-semibold text-teal-800 underline underline-offset-4">
              {current.link ?? "Open"} →
            </Link>
          )}
        </div>
      )}
      {callbackSent && (
        <p role="status" className="mt-4 rounded-[18px] bg-paper p-4 text-[15px] ring-1 ring-line">
          Thank you. Our team will call you soon on your registered number.
        </p>
      )}
    </div>
  );
}
