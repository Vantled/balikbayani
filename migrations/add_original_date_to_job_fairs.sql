-- Migration: Add original_date field to job_fairs table
-- Date: 2025-01-XX
-- Purpose: Store the original date before rescheduling

-- Add original_date column to job_fairs table
ALTER TABLE job_fairs ADD COLUMN IF NOT EXISTS original_date DATE DEFAULT NULL;

