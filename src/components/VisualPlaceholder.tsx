export function VisualPlaceholder({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end rounded-lg bg-gradient-to-br from-stone-300 via-teal-100 to-stone-400 p-4 text-sm font-medium text-stone-800 ${className}`}
      role="img"
      aria-label={label}
    >
      <span className="rounded bg-white/80 px-2 py-1">{label}</span>
    </div>
  );
}
