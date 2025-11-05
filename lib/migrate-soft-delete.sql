-- lib/migrate-soft-delete.sql
ALTER TABLE direct_hire_applications
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS idx_direct_hire_deleted_at ON direct_hire_applications (deleted_at);

-- Extend soft delete to balik_manggagawa_clearance
ALTER TABLE balik_manggagawa_clearance
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_bm_clearance_deleted_at ON balik_manggagawa_clearance (deleted_at);

-- Extend soft delete to gov_to_gov_applications
ALTER TABLE gov_to_gov_applications
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_gov_to_gov_deleted_at ON gov_to_gov_applications (deleted_at);

-- Extend soft delete to job_fair_monitoring
ALTER TABLE job_fair_monitoring
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX IF NOT EXISTS idx_job_fair_monitoring_deleted_at ON job_fair_monitoring (deleted_at);