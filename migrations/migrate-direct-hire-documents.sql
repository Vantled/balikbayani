-- Migration: Add direct hire documents table and update applications table
-- Date: 2025-01-27

-- Create direct_hire_documents table
CREATE TABLE IF NOT EXISTS direct_hire_documents (
    id SERIAL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES direct_hire_applications(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_direct_hire_documents_application_id ON direct_hire_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_direct_hire_documents_type ON direct_hire_documents(document_type);

-- Add new fields to direct_hire_applications table
ALTER TABLE direct_hire_applications 
ADD COLUMN IF NOT EXISTS documents_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for documents_completed field
CREATE INDEX IF NOT EXISTS idx_direct_hire_applications_documents_completed ON direct_hire_applications(documents_completed);

-- Add comments for documentation
COMMENT ON TABLE direct_hire_documents IS 'Stores uploaded documents for direct hire applications';
COMMENT ON COLUMN direct_hire_documents.document_type IS 'Type of document (passport, work_visa, employment_contract, etc.)';
COMMENT ON COLUMN direct_hire_documents.file_data IS 'Binary file data stored in database';
COMMENT ON COLUMN direct_hire_applications.documents_completed IS 'Flag indicating if all required documents have been uploaded and verified';
COMMENT ON COLUMN direct_hire_applications.completed_at IS 'Timestamp when documents were completed';
