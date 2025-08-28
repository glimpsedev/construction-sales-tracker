-- Add indexes for improved performance on date and value filtering
-- These indexes will significantly speed up queries with date ranges and value filtering

-- Create composite index on start_date and status for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_start_date_status ON jobs(start_date, status);

-- Create index on start_date alone for date range queries
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);

-- Create index on user_id and start_date for user-specific date queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_start_date ON jobs(user_id, start_date);

-- Note: projectValue is TEXT type containing formatted strings like "$1,234,567"
-- so we cannot create a numeric index on it directly