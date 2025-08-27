-- Add index on project_value for better filtering performance
CREATE INDEX IF NOT EXISTS idx_jobs_project_value ON jobs(project_value);

-- Add index on userId for better filtering performance  
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Add composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_cold ON jobs(user_id, is_cold);