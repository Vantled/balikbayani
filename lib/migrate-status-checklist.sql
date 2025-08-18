-- lib/migrate-status-checklist.sql
-- Migration to add status_checklist column to direct_hire_applications table

-- Add status_checklist column as JSONB
ALTER TABLE direct_hire_applications 
ADD COLUMN status_checklist JSONB DEFAULT '{
  "evaluated": {"checked": true, "timestamp": null},
  "for_confirmation": {"checked": false, "timestamp": null},
  "emailed_to_dhad": {"checked": false, "timestamp": null},
  "received_from_dhad": {"checked": false, "timestamp": null},
  "for_interview": {"checked": false, "timestamp": null}
}'::jsonb;

-- Update existing applications to have evaluated checked by default
UPDATE direct_hire_applications 
SET status_checklist = '{
  "evaluated": {"checked": true, "timestamp": null},
  "for_confirmation": {"checked": false, "timestamp": null},
  "emailed_to_dhad": {"checked": false, "timestamp": null},
  "received_from_dhad": {"checked": false, "timestamp": null},
  "for_interview": {"checked": false, "timestamp": null}
}'::jsonb
WHERE status = 'evaluated';

-- Update status enum to include new statuses
ALTER TABLE direct_hire_applications 
DROP CONSTRAINT direct_hire_applications_status_check;

ALTER TABLE direct_hire_applications 
ADD CONSTRAINT direct_hire_applications_status_check 
CHECK (status IN ('pending', 'evaluated', 'for_confirmation', 'emailed_to_dhad', 'received_from_dhad', 'for_interview', 'approved', 'rejected'));
