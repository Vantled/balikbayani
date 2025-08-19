-- Add missing fields to balik_manggagawa_clearance table
ALTER TABLE balik_manggagawa_clearance
  ADD COLUMN IF NOT EXISTS no_of_months_years TEXT,
  ADD COLUMN IF NOT EXISTS date_of_departure DATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bm_clearance_no_of_months_years ON balik_manggagawa_clearance (no_of_months_years);
CREATE INDEX IF NOT EXISTS idx_bm_clearance_date_of_departure ON balik_manggagawa_clearance (date_of_departure);
