-- Readable property URLs (/properties/1-kanal-house-abbasia-town) instead of /properties/<uuid>.
ALTER TABLE "Property" ADD COLUMN "slug" TEXT;

-- Backfill: "<title> <locality>" (locality only when the title does not already name it) in lowercase-hyphen form; repeats get -2, -3 …
WITH base AS (
  SELECT id,
         COALESCE(NULLIF(left(trim(both '-' from lower(regexp_replace(CASE WHEN locality = '' OR position(lower(locality) in lower(title)) > 0 THEN title ELSE title || ' ' || locality END, '[^a-zA-Z0-9]+', '-', 'g'))), 80), ''), 'property') AS b
  FROM "Property"
), numbered AS (
  SELECT id, b, row_number() OVER (PARTITION BY b ORDER BY id) AS n FROM base
)
UPDATE "Property" p
SET slug = CASE WHEN numbered.n = 1 THEN numbered.b ELSE numbered.b || '-' || numbered.n END
FROM numbered
WHERE numbered.id = p.id;

CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
