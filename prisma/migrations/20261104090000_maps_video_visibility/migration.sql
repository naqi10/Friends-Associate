-- Location map (Google Maps link, address or coordinates) and video link on listings and projects.
ALTER TABLE "Property" ADD COLUMN "map_link" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Property" ADD COLUMN "video_url" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "map_link" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "video_url" TEXT NOT NULL DEFAULT '';
-- Several photos per project (swipeable gallery on the project page).
ALTER TABLE "Project" ADD COLUMN "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
-- The office can upload a file now and show it to the customer (or on the website) later.
ALTER TABLE "Document" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
