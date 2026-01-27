-- Add filterPreferences JSON column to users table
ALTER TABLE "users" ADD COLUMN "filter_preferences" json;
