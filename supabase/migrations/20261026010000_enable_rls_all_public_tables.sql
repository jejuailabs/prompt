-- All application tables are server-owned: Next.js reaches them through Prisma (postgres role) or the
-- service_role key, and browser clients only use Supabase for auth and signed storage uploads.
-- Enable RLS without policies and drop anon/authenticated privileges so the public anon key
-- can no longer read or write credits, payments, artifacts, etc.
-- Rollback: ALTER TABLE public."<Table>" DISABLE ROW LEVEL SECURITY; GRANT ALL ON TABLE public."<Table>" TO anon, authenticated;
DO $migration$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', t);
  END LOOP;
END
$migration$;
