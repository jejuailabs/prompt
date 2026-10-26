-- Model lab reference images: storage paths (lab-ref/<userId>/...) attached to a generation job.
ALTER TABLE public."GenerationJob" ADD COLUMN IF NOT EXISTS "referencePaths" TEXT;
