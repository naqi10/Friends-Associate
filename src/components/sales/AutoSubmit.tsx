"use client";

/** A <select> or date input that submits its form as soon as it changes (filters, quick edits). */
export function AutoSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

export function AutoDate(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
