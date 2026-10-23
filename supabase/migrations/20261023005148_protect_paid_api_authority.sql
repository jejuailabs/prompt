-- Roles, AI API approvals and MCP credentials are server-owned authorization data.
-- Next.js uses the private database connection; browser clients must never write them.
DO $migration$
DECLARE protected_table text;
BEGIN
  FOREACH protected_table IN ARRAY ARRAY['Profile', 'Setting', 'McpToken'] LOOP
    IF to_regclass(format('public.%I', protected_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', protected_table);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', protected_table);
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', protected_table);
    END IF;
  END LOOP;
END
$migration$;
