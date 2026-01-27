-- Change temperature field from enum to text to support custom filter values
-- Check if temperature is already text (already migrated)
DO $$
BEGIN
    -- Only run migration if temperature column exists and is enum type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'temperature'
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Add a new text column
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "temperature_text" text;
        
        -- Copy existing enum values to text column
        UPDATE "jobs" SET "temperature_text" = "temperature"::text WHERE "temperature" IS NOT NULL;
        
        -- Drop the old enum column
        ALTER TABLE "jobs" DROP COLUMN IF EXISTS "temperature";
        
        -- Rename the new column to temperature
        ALTER TABLE "jobs" RENAME COLUMN "temperature_text" TO "temperature";
    END IF;
END $$;
