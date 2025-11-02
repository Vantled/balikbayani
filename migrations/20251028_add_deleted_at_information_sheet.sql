-- Add soft-delete support to information_sheet_records
ALTER TABLE information_sheet_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Optional index for faster filtering
CREATE INDEX IF NOT EXISTS idx_information_sheet_deleted_at
  ON information_sheet_records (deleted_at);

