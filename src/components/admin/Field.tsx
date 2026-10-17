type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Field({ label, hint, className = "", ...input }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {label}
        {input.required && <span className="text-red-600"> *</span>}
      </span>
      <input {...input} className={`mt-1 w-full rounded-md border border-stone-300 px-3 py-2 ${className}`} />
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly (string | { value: string; label: string })[];
};

export function SelectField({ label, options, ...select }: SelectProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {label}
        {select.required && <span className="text-red-600"> *</span>}
      </span>
      <select {...select} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2">
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

export function Notice({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-3 rounded-md bg-teal-50 p-3 text-sm text-teal-900">{message}</p>;
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string };

export function TextAreaField({ label, hint, rows = 3, ...area }: TextAreaProps) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {label}
        {area.required && <span className="text-red-600"> *</span>}
      </span>
      <textarea {...area} rows={rows} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function CheckboxField({ label, hint, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" {...input} className="mt-0.5 h-4 w-4" />
      <span>
        <span className="font-medium text-stone-700">{label}</span>
        {hint && <span className="block text-xs text-stone-500">{hint}</span>}
      </span>
    </label>
  );
}
