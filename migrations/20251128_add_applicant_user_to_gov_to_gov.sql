-- migrations/20251128_add_applicant_user_to_gov_to_gov.sql
-- Links applicant submissions to gov_to_gov_applications for applicant portal

ALTER TABLE gov_to_gov_applications
  ADD COLUMN IF NOT EXISTS applicant_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_gov_to_gov_applicant_user
  ON gov_to_gov_applications(applicant_user_id);

