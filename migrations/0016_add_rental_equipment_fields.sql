-- Add new fields to rental_equipment table for expanded equipment tracking
ALTER TABLE "rental_equipment" ADD COLUMN IF NOT EXISTS "serial_number" text;
ALTER TABLE "rental_equipment" ADD COLUMN IF NOT EXISTS "year" text;
ALTER TABLE "rental_equipment" ADD COLUMN IF NOT EXISTS "specs" text;
ALTER TABLE "rental_equipment" ADD COLUMN IF NOT EXISTS "days_on_off_rent" integer;
ALTER TABLE "rental_equipment" ADD COLUMN IF NOT EXISTS "monthly_rate" integer;
