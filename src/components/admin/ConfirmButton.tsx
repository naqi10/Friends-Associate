"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Button that asks "Are you sure?" in a small card before submitting its form. The server action still
 * re-checks permissions; this only protects against an accidental click.
 */
export function ConfirmButton({
  message,
  children,
  className = "",
  tone = "danger",
  title,
  confirmLabel,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  tone?: "danger" | "neutral";
  title?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const colours =
    tone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800"
      : "border-[1.5px] border-line-strong bg-white text-ink hover:bg-mist";

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full px-5 py-2.5 text-sm font-semibold ${colours} ${className}`}
      >
        {children}
      </button>
      <ConfirmDialog
        open={open}
        tone={tone}
        title={title}
        message={message}
        confirmLabel={confirmLabel ?? "Yes, continue"}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          ref.current?.form?.requestSubmit();
        }}
      />
    </>
  );
}
