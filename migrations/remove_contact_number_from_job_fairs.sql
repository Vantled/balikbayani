-- Migration: Remove contact_number column from job_fairs table
-- Date: 2024-01-XX
-- Reason: Contact numbers are now stored in separate job_fair_contacts table

-- Remove the contact_number column from job_fairs table
ALTER TABLE job_fairs DROP COLUMN IF EXISTS contact_number;
