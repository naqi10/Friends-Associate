-- Supabase publishes every table in the "public" schema through its REST API (anon key).
-- This app never uses that API: it connects directly as the table owner via Prisma, and owners
-- are not subject to RLS. Turning RLS on with no policies therefore locks the REST API out of
-- every table while the website keeps working. New tables need the same line in their migration.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
