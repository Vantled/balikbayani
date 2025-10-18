-- Add job_type column to balik_manggagawa_clearance table
ALTER TABLE balik_manggagawa_clearance
ADD COLUMN IF NOT EXISTS job_type VARCHAR(20);

-- Add constraint to ensure valid job_type values
ALTER TABLE balik_manggagawa_clearance
ADD CONSTRAINT IF NOT EXISTS balik_manggagawa_clearance_job_type_check
CHECK (job_type IN ('professional', 'household') OR job_type IS NULL);
