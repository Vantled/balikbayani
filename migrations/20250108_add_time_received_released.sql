-- Add time_received and time_released columns to application tables for process cycle time tracking

-- Direct Hire Applications
ALTER TABLE direct_hire_applications
ADD COLUMN IF NOT EXISTS time_received TIMESTAMP WITH TIME ZONE;

ALTER TABLE direct_hire_applications
ADD COLUMN IF NOT EXISTS time_released TIMESTAMP WITH TIME ZONE;

-- Balik Manggagawa Clearance
ALTER TABLE balik_manggagawa_clearance
ADD COLUMN IF NOT EXISTS time_received TIMESTAMP WITH TIME ZONE;

ALTER TABLE balik_manggagawa_clearance
ADD COLUMN IF NOT EXISTS time_released TIMESTAMP WITH TIME ZONE;

-- Gov to Gov Applications
ALTER TABLE gov_to_gov_applications
ADD COLUMN IF NOT EXISTS time_received TIMESTAMP WITH TIME ZONE;

ALTER TABLE gov_to_gov_applications
ADD COLUMN IF NOT EXISTS time_released TIMESTAMP WITH TIME ZONE;

-- Note: information_sheet_records already has these fields

