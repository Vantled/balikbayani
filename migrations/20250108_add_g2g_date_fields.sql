-- Add date_received_by_region and date_card_released columns to gov_to_gov_applications table

ALTER TABLE gov_to_gov_applications
  ADD COLUMN IF NOT EXISTS date_received_by_region DATE;

ALTER TABLE gov_to_gov_applications
  ADD COLUMN IF NOT EXISTS date_card_released DATE;

