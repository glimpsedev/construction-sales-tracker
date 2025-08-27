ALTER TABLE "jobs" ADD COLUMN "is_cold" boolean DEFAULT false NOT NULL;

-- Backfill is_cold based on existing data:
-- Set is_cold = true where temperature = 'cold' OR (is_viewed = true AND temperature IS NULL)
UPDATE "jobs" 
SET "is_cold" = true 
WHERE "temperature" = 'cold' 
   OR ("is_viewed" = true AND "temperature" IS NULL);