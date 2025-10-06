-- Add raw_salary and salary_currency columns to BM clearance

ALTER TABLE balik_manggagawa_clearance
  ADD COLUMN IF NOT EXISTS raw_salary DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10);

-- Optional: backfill existing rows' raw_salary with salary where currency unknown
UPDATE balik_manggagawa_clearance
SET raw_salary = salary
WHERE raw_salary IS NULL;


