import { mapEmbed } from "@/lib/map";

/** The location of a listing or project on Google Maps, with a button to open it in the Maps app. Nothing when there is none. */
export function LocationMap({ link, title, className = "" }: { link: string; title: string; className?: string }) {
  const map = link ? mapEmbed(link) : null;
  if (!map) return null;
  return (
    <section aria-label={`${title} location`} className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Location map</h2>
        {map.open && (
          <a href={map.open} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
            Open in Google Maps ↗
          </a>
        )}
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-box border border-line bg-ph sm:aspect-[16/9]">
        <iframe
          src={map.embed}
          title={`Map: ${title}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </section>
  );
}
