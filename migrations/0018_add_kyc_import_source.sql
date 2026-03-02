-- Add kyc_import to contact_source enum for KYC Master spreadsheet import
ALTER TYPE contact_source ADD VALUE IF NOT EXISTS 'kyc_import';
