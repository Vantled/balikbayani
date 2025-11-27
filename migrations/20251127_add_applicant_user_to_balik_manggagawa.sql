-- migrations/20251127_add_applicant_user_to_balik_manggagawa.sql
-- Adds applicant_user_id column to BM clearance records so we can link applicant submissions

ALTER TABLE balik_manggagawa_clearance
  ADD COLUMN IF NOT EXISTS applicant_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_bm_applicant_user
  ON balik_manggagawa_clearance(applicant_user_id);

