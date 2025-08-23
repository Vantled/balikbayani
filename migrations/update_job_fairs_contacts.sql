-- Migration: Update Job Fairs to support multiple contact numbers
-- Date: 2024-01-XX

-- Step 1: Create the new job_fair_contacts table
CREATE TABLE IF NOT EXISTS job_fair_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_fair_id UUID NOT NULL REFERENCES job_fairs(id) ON DELETE CASCADE,
    contact_category VARCHAR(50) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Migrate existing contact_number data to the new table
INSERT INTO job_fair_contacts (job_fair_id, contact_category, contact_number)
SELECT 
    id as job_fair_id,
    'Phone' as contact_category,
    contact_number
FROM job_fairs 
WHERE contact_number IS NOT NULL AND contact_number != '';

-- Step 3: Remove the contact_number column from job_fairs table
ALTER TABLE job_fairs DROP COLUMN IF EXISTS contact_number;

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_job_fair_contacts_job_fair_id ON job_fair_contacts(job_fair_id);

-- Step 5: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_job_fair_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_fair_contacts_updated_at 
    BEFORE UPDATE ON job_fair_contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_job_fair_contacts_updated_at();
