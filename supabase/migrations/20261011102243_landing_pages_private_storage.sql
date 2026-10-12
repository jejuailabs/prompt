-- Prepared for review. This file has NOT been applied to the operational project.
-- The existing public Artifact table is left unchanged.
BEGIN;
CREATE SCHEMA IF NOT EXISTS landing_private;
REVOKE ALL ON SCHEMA landing_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA landing_private TO service_role;

CREATE TABLE IF NOT EXISTS landing_private.pages (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  metadata jsonb NOT NULL CHECK (metadata @> '{"schema":1}'::jsonb),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS landing_pages_owner_created ON landing_private.pages(owner_id, created_at DESC);
ALTER TABLE landing_private.pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON landing_private.pages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON landing_private.pages TO service_role;
COMMENT ON TABLE landing_private.pages IS 'Private static landing-page packages. Access only through verified-owner server APIs; do not expose landing_private through Data API.';

INSERT INTO storage.buckets(id, name, public, file_size_limit)
VALUES ('landing-pages', 'landing-pages', false, 52428800)
ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='landing-pages' AND public) THEN
    RAISE EXCEPTION 'landing-pages bucket must be private; review its existing contents before changing visibility';
  END IF;
END $$;
UPDATE storage.buckets SET file_size_limit=52428800,allowed_mime_types=NULL WHERE id='landing-pages';

-- Existing broad permissive storage policies must not expose this bucket.
-- Signed upload/download capabilities are issued server-side; service_role bypasses RLS.
DROP POLICY IF EXISTS landing_pages_no_direct_client_access ON storage.objects;
CREATE POLICY landing_pages_no_direct_client_access ON storage.objects AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING(bucket_id <> 'landing-pages')
WITH CHECK(bucket_id <> 'landing-pages');
COMMIT;
