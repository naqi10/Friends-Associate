"use client";

import { useState } from "react";
import { Icon } from "@/components/admin/shell/icons";

/** A password input with an eye button that shows or hides what was typed. */
export function PasswordInput({ className = "", ...input }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative block">
      <input {...input} type={shown ? "text" : "password"} className={className} />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-[calc(50%-2px)] items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink"
      >
        <Icon name={shown ? "eye-off" : "eye"} className="h-5 w-5" />
      </button>
    </span>
  );
}
