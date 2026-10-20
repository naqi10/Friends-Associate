"use client";

import { useEffect, useRef } from "react";

/**
 * Small "Are you sure?" card shown over the page (native <dialog>: focus is trapped, Esc closes it).
 */
export function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Yes, delete",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dimmed backdrop (the dialog element itself, outside the card) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(400px,calc(100vw-2rem))] rounded-[28px] border-[3px] border-white bg-white p-0 text-left shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6">
        <div
          aria-hidden
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${tone === "danger" ? "bg-red-50 text-red-700" : "bg-mist text-ink"}`}
        >
          {tone === "danger" ? "!" : "?"}
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-body">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="rounded-full border-[1.5px] border-line-strong px-5 py-2.5 text-sm font-semibold text-ink outline-none hover:bg-mist focus-visible:ring-2 focus-visible:ring-ink/25"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white ${tone === "danger" ? "bg-red-700 hover:bg-red-800" : "bg-ink hover:bg-body"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
