export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-56 rounded bg-stone-200" />
      <div className="mt-3 h-4 w-80 rounded bg-stone-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-stone-200" />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
