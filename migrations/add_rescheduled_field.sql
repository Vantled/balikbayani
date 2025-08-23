-- Migration: Add is_rescheduled field to job_fairs table
-- Date: 2024-01-XX

-- Add is_rescheduled column to job_fairs table
ALTER TABLE job_fairs ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT FALSE;

-- Update existing records to have is_rescheduled = false
UPDATE job_fairs SET is_rescheduled = FALSE WHERE is_rescheduled IS NULL;
