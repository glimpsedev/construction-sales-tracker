-- Add fields for safer CSV import tracking
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
ADD COLUMN IF NOT EXISTS locked_fields JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMP;

-- Create dedupe_key for all existing jobs (using address and county as location)
UPDATE jobs 
SET dedupe_key = LOWER(TRIM(COALESCE(name, ''))) || '|' || 
                 LOWER(TRIM(COALESCE(address, ''))) || '|' || 
                 LOWER(TRIM(COALESCE(county, '')))
WHERE dedupe_key IS NULL;

-- Handle null dedupe_keys with a fallback
UPDATE jobs 
SET dedupe_key = 'legacy_' || id
WHERE dedupe_key IS NULL OR dedupe_key = '||';

-- Make dedupe_key NOT NULL after backfill
ALTER TABLE jobs ALTER COLUMN dedupe_key SET NOT NULL;

-- Set external_id from dodge_job_id if available
UPDATE jobs SET external_id = dodge_job_id WHERE external_id IS NULL AND dodge_job_id IS NOT NULL;