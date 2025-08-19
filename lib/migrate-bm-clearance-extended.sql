-- Extend balik_manggagawa_clearance with form-specific fields
ALTER TABLE balik_manggagawa_clearance
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS months_years TEXT,
  ADD COLUMN IF NOT EXISTS with_principal TEXT,
  ADD COLUMN IF NOT EXISTS new_principal_name TEXT,
  ADD COLUMN IF NOT EXISTS employment_duration TEXT,
  ADD COLUMN IF NOT EXISTS date_arrival DATE,
  ADD COLUMN IF NOT EXISTS date_departure DATE,
  ADD COLUMN IF NOT EXISTS place_date_employment TEXT,
  ADD COLUMN IF NOT EXISTS date_blacklisting DATE,
  ADD COLUMN IF NOT EXISTS total_deployed_ofws INTEGER,
  ADD COLUMN IF NOT EXISTS reason_blacklisting TEXT,
  ADD COLUMN IF NOT EXISTS years_with_principal INTEGER,
  ADD COLUMN IF NOT EXISTS remarks TEXT;


