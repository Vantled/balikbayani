-- lib/migrate-soft-delete.sql
ALTER TABLE direct_hire_applications
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS idx_direct_hire_deleted_at ON direct_hire_applications (deleted_at);
