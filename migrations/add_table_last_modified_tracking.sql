-- Migration: Add table for tracking last modification times
-- Date: 2024-12-15

-- Table to track last modification time for each table
CREATE TABLE IF NOT EXISTS table_last_modified (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL UNIQUE,
    last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial records for existing tables
INSERT INTO table_last_modified (table_name, last_modified_at) VALUES
    ('job_fairs', CURRENT_TIMESTAMP),
    ('job_fair_monitoring', CURRENT_TIMESTAMP),
    ('peso_contacts', CURRENT_TIMESTAMP),
    ('pra_contacts', CURRENT_TIMESTAMP)
ON CONFLICT (table_name) DO NOTHING;

-- Function to update last modified timestamp
CREATE OR REPLACE FUNCTION update_table_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO table_last_modified (table_name, last_modified_at)
    VALUES (TG_TABLE_NAME, CURRENT_TIMESTAMP)
    ON CONFLICT (table_name) 
    DO UPDATE SET last_modified_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS trigger_job_fairs_last_modified ON job_fairs;
CREATE TRIGGER trigger_job_fairs_last_modified
    AFTER INSERT OR UPDATE OR DELETE ON job_fairs
    FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();

DROP TRIGGER IF EXISTS trigger_job_fair_monitoring_last_modified ON job_fair_monitoring;
CREATE TRIGGER trigger_job_fair_monitoring_last_modified
    AFTER INSERT OR UPDATE OR DELETE ON job_fair_monitoring
    FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();

DROP TRIGGER IF EXISTS trigger_peso_contacts_last_modified ON peso_contacts;
CREATE TRIGGER trigger_peso_contacts_last_modified
    AFTER INSERT OR UPDATE OR DELETE ON peso_contacts
    FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();

DROP TRIGGER IF EXISTS trigger_pra_contacts_last_modified ON pra_contacts;
CREATE TRIGGER trigger_pra_contacts_last_modified
    AFTER INSERT OR UPDATE OR DELETE ON pra_contacts
    FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();
