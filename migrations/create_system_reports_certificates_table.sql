-- Create table for system reports certificates
CREATE TABLE IF NOT EXISTS system_reports_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_reports_certificates_month_year ON system_reports_certificates(year, month);
CREATE INDEX IF NOT EXISTS idx_system_reports_certificates_created_at ON system_reports_certificates(created_at);
CREATE INDEX IF NOT EXISTS idx_system_reports_certificates_created_by ON system_reports_certificates(created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_system_reports_certificates_updated_at 
BEFORE UPDATE ON system_reports_certificates 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

