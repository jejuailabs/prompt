-- Class studio: each image keeps the aspect it was generated at ('1:1' | '3:4' | '4:3' | '9:16' | '16:9').
-- Rollback: ALTER TABLE public."ClassGeneration" DROP COLUMN "aspect";
ALTER TABLE public."ClassGeneration" ADD COLUMN IF NOT EXISTS "aspect" TEXT NOT NULL DEFAULT '1:1';
