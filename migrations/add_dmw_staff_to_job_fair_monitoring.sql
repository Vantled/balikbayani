-- Add DMW Staff Assigned field to job_fair_monitoring table
ALTER TABLE job_fair_monitoring 
ADD COLUMN dmw_staff_assigned VARCHAR(255);

-- Add comment to document the field
COMMENT ON COLUMN job_fair_monitoring.dmw_staff_assigned IS 'DMW Staff assigned to the Job Fair';
