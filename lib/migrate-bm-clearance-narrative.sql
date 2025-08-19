-- Add narrative fields for For Assessment Country clearance type
ALTER TABLE balik_manggagawa_clearance 
ADD COLUMN IF NOT EXISTS employment_start_date DATE NULL,
ADD COLUMN IF NOT EXISTS processing_date DATE NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bm_clearance_employment_start_date ON balik_manggagawa_clearance (employment_start_date);
CREATE INDEX IF NOT EXISTS idx_bm_clearance_processing_date ON balik_manggagawa_clearance (processing_date);
