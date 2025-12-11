DB: bm_corrections table to store flags (field_key/message/created_by/resolved_at).
Staff API: POST /api/balik-manggagawa/clearance/[id]/corrections (flag/re-flag, set needs_correction & correction_fields), PATCH .../corrections (resolve).
Applicant API: POST .../corrections/resolve (applicant resubmits flagged fields).
UI (BM page, pending only):
Flag buttons on the fields shown in your screenshot (name_of_worker, sex, destination, position, job_type, employer, salary, salary_currency).
“Return for Compliance” button (pending only) with modal; flags required to send back.
Orange/red/green flag states and resolve/check/cross like Direct Hire.
Keep view modal open after flagging.
Notifications: applicant plus the staff who flagged the fields when applicant resubmits.