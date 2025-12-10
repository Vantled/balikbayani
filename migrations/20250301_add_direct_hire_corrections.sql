-- Add correction workflow for Direct Hire applications

ALTER TABLE direct_hire_applications
  ADD COLUMN IF NOT EXISTS needs_correction BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_fields JSONB,
  ADD COLUMN IF NOT EXISTS correction_note TEXT;

CREATE TABLE IF NOT EXISTS direct_hire_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES direct_hire_applications(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_hire_corrections_app ON direct_hire_corrections(application_id);

