"use client";

import { useEffect, useRef } from "react";

/**
 * Notes when the form appeared in the visitor's browser. Bots that post straight to the server (or within a
 * second of loading) are dropped by the server (see formTimerProblem); people never notice it.
 */
export function FormTimer() {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const stamp = () => (el.value = String(Date.now()));
    stamp();
    // After a failed send React resets the form, which empties this field: start the clock again.
    const form = el.form;
    const again = () => window.setTimeout(stamp, 0);
    form?.addEventListener("reset", again);
    return () => form?.removeEventListener("reset", again);
  }, []);
  return <input ref={input} type="hidden" name="ft" defaultValue="" />;
}
