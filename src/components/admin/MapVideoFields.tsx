import { Field } from "@/components/admin/Field";
import { LocationMap } from "@/components/public/LocationMap";

/** "Location map" and "Video" on the listing and project forms, with the current map shown under them. */
export function MapVideoFields({ mapLink = "", videoUrl = "", title = "" }: { mapLink?: string; videoUrl?: string; title?: string }) {
  return (
    <div className="space-y-4 rounded-[22px] border border-line bg-paper p-4">
      <Field
        label="Location map (optional)"
        name="map_link"
        defaultValue={mapLink}
        maxLength={2000}
        placeholder="https://maps.app.goo.gl/…  or  28.4202, 70.2952"
        hint="In Google Maps, open the place → Share → Copy link, and paste it here. Coordinates or an address also work. The map shows on the website page."
      />
      {mapLink && <LocationMap link={mapLink} title={title || "Current location"} />}
      <Field
        label="Video (optional)"
        name="video_url"
        type="url"
        defaultValue={videoUrl}
        maxLength={500}
        placeholder="https://www.youtube.com/watch?v=…"
        hint="A YouTube, Facebook or Google Drive video link (Drive: share as “Anyone with the link”), or a direct link to an .mp4 file. It plays on the website page."
      />
    </div>
  );
}
