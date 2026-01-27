-- Add is_favorite field to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "is_favorite" boolean NOT NULL DEFAULT false;
