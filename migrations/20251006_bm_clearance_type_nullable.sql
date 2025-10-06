-- Make clearance_type nullable and relax check constraint to allow NULL
-- This supports BM applications without a specific clearance type

ALTER TABLE balik_manggagawa_clearance
  DROP CONSTRAINT IF EXISTS balik_manggagawa_clearance_clearance_type_check;

ALTER TABLE balik_manggagawa_clearance
  ALTER COLUMN clearance_type DROP NOT NULL;

ALTER TABLE balik_manggagawa_clearance
  ADD CONSTRAINT balik_mangganggagawa_clearance_type_check
  CHECK (
    clearance_type IS NULL OR clearance_type IN (
      'watchlisted_employer',
      'seafarer_position',
      'non_compliant_country',
      'no_verified_contract',
      'for_assessment_country',
      'critical_skill',
      'watchlisted_similar_name'
    )
  );


