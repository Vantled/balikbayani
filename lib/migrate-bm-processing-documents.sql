-- Add document tracking fields to balik_manggagawa_processing table
ALTER TABLE balik_manggagawa_processing
ADD COLUMN IF NOT EXISTS personal_letter_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS valid_passport_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS work_visa_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS employment_contract_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS employment_certificate_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS last_arrival_email_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS flight_ticket_file VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS documents_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bm_processing_documents_completed ON balik_manggagawa_processing (documents_completed);
CREATE INDEX IF NOT EXISTS idx_bm_processing_completed_at ON balik_manggagawa_processing (completed_at);
