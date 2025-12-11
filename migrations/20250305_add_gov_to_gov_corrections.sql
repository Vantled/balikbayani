-- Add correction workflow for Gov-to-Gov applications

ALTER TABLE gov_to_gov_applications
  ADD COLUMN IF NOT EXISTS needs_correction BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_fields JSONB,
  ADD COLUMN IF NOT EXISTS correction_note TEXT;

CREATE TABLE IF NOT EXISTS gov_to_gov_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES gov_to_gov_applications(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_to_gov_corrections_application ON gov_to_gov_corrections(application_id);

