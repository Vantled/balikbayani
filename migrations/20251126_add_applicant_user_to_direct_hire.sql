-- migrations/20251126_add_applicant_user_to_direct_hire.sql
ALTER TABLE direct_hire_applications
  ADD COLUMN IF NOT EXISTS applicant_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_direct_hire_applicant_user
  ON direct_hire_applications(applicant_user_id);

