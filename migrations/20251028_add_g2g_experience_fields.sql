-- Add experience detail fields to gov_to_gov_applications
-- Taiwan Work Experience details
ALTER TABLE gov_to_gov_applications
  ADD COLUMN IF NOT EXISTS taiwan_company TEXT,
  ADD COLUMN IF NOT EXISTS taiwan_year_started INTEGER,
  ADD COLUMN IF NOT EXISTS taiwan_year_ended INTEGER;

-- Other Job Experience details
ALTER TABLE gov_to_gov_applications
  ADD COLUMN IF NOT EXISTS other_company TEXT,
  ADD COLUMN IF NOT EXISTS other_year_started INTEGER,
  ADD COLUMN IF NOT EXISTS other_year_ended INTEGER;


