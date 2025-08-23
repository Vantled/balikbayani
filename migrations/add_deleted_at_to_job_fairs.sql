-- Migration: Add deleted_at column to job_fairs table for soft delete functionality
-- Date: 2025-01-27

-- Add deleted_at column to job_fairs table
ALTER TABLE job_fairs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better query performance when filtering deleted records
CREATE INDEX IF NOT EXISTS idx_job_fairs_deleted_at ON job_fairs(deleted_at);

-- Update existing records to ensure deleted_at is NULL for active records
UPDATE job_fairs SET deleted_at = NULL WHERE deleted_at IS NULL;
