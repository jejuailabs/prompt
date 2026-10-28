-- Class studio: time-boxed, login-free image generation rooms opened by an admin for a class.
-- Students join by QR code with a nickname only; spend is capped per session (budgetKrw) and per student.
-- Server-owned like every other public table: RLS on with no policies, no anon/authenticated privileges.
-- Rollback: DROP TABLE public."ClassGeneration", public."ClassParticipant", public."ClassSession";
CREATE TABLE IF NOT EXISTS public."ClassSession" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "hostId" TEXT NOT NULL REFERENCES public."Profile"("id"),
  "providerId" TEXT NOT NULL REFERENCES public."ModelProvider"("id"),
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "maxParticipants" INTEGER NOT NULL DEFAULT 15,
  "perUserLimit" INTEGER NOT NULL DEFAULT 10,
  "budgetKrw" DOUBLE PRECISION NOT NULL DEFAULT 15000,
  "boardPublic" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."ClassParticipant" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES public."ClassSession"("id") ON DELETE CASCADE,
  "nickname" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "blocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sessionId", "nickname")
);

CREATE TABLE IF NOT EXISTS public."ClassGeneration" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES public."ClassSession"("id") ON DELETE CASCADE,
  "participantId" TEXT NOT NULL REFERENCES public."ClassParticipant"("id") ON DELETE CASCADE,
  "promptText" TEXT NOT NULL,
  "referencePath" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "resultUrl" TEXT,
  "hidden" BOOLEAN NOT NULL DEFAULT FALSE,
  "costActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "usage" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "ClassGeneration_sessionId_createdAt_idx" ON public."ClassGeneration" ("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassGeneration_participantId_idx" ON public."ClassGeneration" ("participantId");

DO $migration$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ClassSession', 'ClassParticipant', 'ClassGeneration'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', t);
  END LOOP;
END
$migration$;
