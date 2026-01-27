-- Change temperature field from enum to text to support custom filter values
-- First, add a new text column
ALTER TABLE "jobs" ADD COLUMN "temperature_text" text;

-- Copy existing enum values to text column
UPDATE "jobs" SET "temperature_text" = "temperature"::text WHERE "temperature" IS NOT NULL;

-- Drop the old enum column (this will fail if there are constraints, so we handle it carefully)
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "temperature";

-- Rename the new column to temperature
ALTER TABLE "jobs" RENAME COLUMN "temperature_text" TO "temperature";
