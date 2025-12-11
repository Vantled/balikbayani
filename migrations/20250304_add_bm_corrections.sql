-- Add correction workflow for Balik Manggagawa clearances

ALTER TABLE balik_manggagawa_clearance
  ADD COLUMN IF NOT EXISTS needs_correction BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_fields JSONB,
  ADD COLUMN IF NOT EXISTS correction_note TEXT;

CREATE TABLE IF NOT EXISTS bm_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clearance_id UUID NOT NULL REFERENCES balik_manggagawa_clearance(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bm_corrections_clearance ON bm_corrections(clearance_id);

