-- lib/migrate-add-employer.sql
ALTER TABLE direct_hire_applications
ADD COLUMN IF NOT EXISTS employer VARCHAR(255);
