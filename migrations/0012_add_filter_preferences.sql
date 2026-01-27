-- Add filterPreferences JSON column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "filter_preferences" json;
