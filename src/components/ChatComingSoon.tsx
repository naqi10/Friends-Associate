"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

/**
 * Shown instead of the assistant while the chatbot release switch is off (DISABLED_FEATURES=chatbot).
 * Same button and position as the real chat, so the switch-over is seamless.
 */
export function ChatComingSoon() {
  const [open, setOpen] = useState(false);
  const whatsapp = `https://wa.me/${BRAND.phoneIntl.replace(/\D/g, "")}`;
  const tel = `tel:${BRAND.phoneIntl.replace(/\s/g, "")}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-2xl text-paper shadow-lg ring-2 ring-paper hover:bg-body md:bottom-6"
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        aria-controls="fa-chat-soon"
      >
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div
          id="fa-chat-soon"
          role="dialog"
          aria-label="Assistant coming soon"
          className="fixed bottom-36 right-4 z-50 w-[min(340px,calc(100vw-2rem))] rounded-card border border-line bg-paper p-5 shadow-2xl md:bottom-24"
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Coming soon</p>
          <p className="mt-2 font-serif text-2xl leading-tight text-ink">Our online assistant in English, Urdu and Roman Urdu.</p>
          <p className="mt-2 text-sm text-body">Until it opens, our team is happy to help directly.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
            <a href={tel} className="flex min-h-11 items-center justify-center rounded-full bg-ink px-3 text-paper">
              Call now
            </a>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-ink px-3 text-ink"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
