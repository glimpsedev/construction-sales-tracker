-- Add 'office' to job_type enum
-- Note: IF NOT EXISTS is not supported in all PostgreSQL versions
-- This will fail gracefully if 'office' already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'office' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_type')
    ) THEN
        ALTER TYPE "job_type" ADD VALUE 'office';
    END IF;
END $$;
