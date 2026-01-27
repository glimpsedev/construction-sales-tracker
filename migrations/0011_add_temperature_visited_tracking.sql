-- Add fields to track when temperature was set
ALTER TABLE jobs ADD COLUMN temperature_set_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN visited BOOLEAN DEFAULT false;

-- Backfill existing jobs: mark as visited if they have a temperature set
UPDATE jobs 
SET visited = true, 
    temperature_set_at = COALESCE(last_updated, created_at)
WHERE temperature IN ('hot', 'warm', 'cold');

-- Create index for performance
CREATE INDEX idx_jobs_visited ON jobs(visited);