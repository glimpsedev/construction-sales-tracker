-- Add is_cold column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'is_cold'
    ) THEN
        ALTER TABLE "jobs" ADD COLUMN "is_cold" boolean DEFAULT false NOT NULL;
    END IF;
END $$;

-- Backfill is_cold based on existing data:
-- Set is_cold = true where temperature = 'cold' OR (is_viewed = true AND temperature IS NULL)
-- Only update rows where is_cold is false to avoid unnecessary updates
UPDATE "jobs" 
SET "is_cold" = true 
WHERE ("temperature" = 'cold' OR ("is_viewed" = true AND "temperature" IS NULL))
  AND "is_cold" = false;