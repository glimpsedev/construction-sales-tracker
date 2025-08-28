-- Add new fields from updated Dodge Data format
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS contractor_phone TEXT,
ADD COLUMN IF NOT EXISTS contractor_address TEXT,
ADD COLUMN IF NOT EXISTS contractor_city TEXT,
ADD COLUMN IF NOT EXISTS contractor_county TEXT,
ADD COLUMN IF NOT EXISTS contractor_email TEXT,
ADD COLUMN IF NOT EXISTS contractor_website TEXT,
ADD COLUMN IF NOT EXISTS contractor_contact TEXT,
ADD COLUMN IF NOT EXISTS owner_phone TEXT,
ADD COLUMN IF NOT EXISTS construction_manager TEXT,
ADD COLUMN IF NOT EXISTS construction_manager_phone TEXT,
ADD COLUMN IF NOT EXISTS project_url TEXT,
ADD COLUMN IF NOT EXISTS version_number TEXT,
ADD COLUMN IF NOT EXISTS project_number TEXT,
ADD COLUMN IF NOT EXISTS additional_features TEXT,
ADD COLUMN IF NOT EXISTS delivery_system TEXT,
ADD COLUMN IF NOT EXISTS specs_available TEXT,
ADD COLUMN IF NOT EXISTS work_type TEXT;

-- Create indexes for new fields that might be searched/filtered
CREATE INDEX IF NOT EXISTS idx_jobs_work_type ON jobs(work_type);
CREATE INDEX IF NOT EXISTS idx_jobs_project_number ON jobs(project_number);