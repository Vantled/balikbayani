-- Add status field to balik_manggagawa_clearance table
ALTER TABLE balik_manggagawa_clearance
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bm_clearance_status ON balik_manggagawa_clearance (status);
