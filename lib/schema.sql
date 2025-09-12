-- lib/schema.sql
-- BalikBayani Portal Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('superadmin', 'admin', 'staff')),
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_first_login BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Direct Hire Applications
CREATE TABLE direct_hire_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    cellphone VARCHAR(20),
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
    salary DECIMAL(12,2) NOT NULL,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    raw_salary DECIMAL(12,2),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'evaluated', 'for_confirmation', 'for_interview', 'approved', 'rejected')),
    jobsite VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    job_type VARCHAR(20) NOT NULL DEFAULT 'professional' CHECK (job_type IN ('household', 'professional')),
    evaluator VARCHAR(255),
    employer VARCHAR(255),
    status_checklist JSONB DEFAULT '{"evaluated": {"checked": false, "timestamp": null}, "for_confirmation": {"checked": false, "timestamp": null}, "emailed_to_dhad": {"checked": false, "timestamp": null}, "received_from_dhad": {"checked": false, "timestamp": null}, "for_interview": {"checked": false, "timestamp": null}}',
    documents_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Personal Information for Direct Hire
CREATE TABLE personal_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES direct_hire_applications(id) ON DELETE CASCADE,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    age INTEGER NOT NULL,
    height INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    educational_attainment VARCHAR(100) NOT NULL,
    present_address TEXT NOT NULL,
    email_address VARCHAR(255),
    contact_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employment Information for Direct Hire
CREATE TABLE employment_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES direct_hire_applications(id) ON DELETE CASCADE,
    employer_name VARCHAR(255) NOT NULL,
    employer_address TEXT NOT NULL,
    position VARCHAR(255) NOT NULL,
    salary DECIMAL(12,2) NOT NULL,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    job_site VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Balik Manggagawa Clearance
CREATE TABLE balik_manggagawa_clearance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    name_of_worker VARCHAR(255) NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
    employer VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    salary DECIMAL(12,2) NOT NULL,
    clearance_type VARCHAR(50) NOT NULL CHECK (clearance_type IN ('watchlisted_employer', 'seafarer_position', 'non_compliant_country', 'no_verified_contract', 'for_assessment_country', 'critical_skill', 'watchlisted_similar_name')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Balik Manggagawa Processing
CREATE TABLE balik_manggagawa_processing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    or_number VARCHAR(50) UNIQUE NOT NULL,
    name_of_worker VARCHAR(255) NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
    address TEXT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Counter Monitoring
CREATE TABLE counter_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_id UUID NOT NULL REFERENCES balik_manggagawa_processing(id) ON DELETE CASCADE,
    counter_number VARCHAR(20) NOT NULL,
    time_in TIMESTAMP WITH TIME ZONE[] NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gov to Gov Applications
CREATE TABLE gov_to_gov_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
    date_of_birth DATE NOT NULL,
    age INTEGER NOT NULL,
    height INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    educational_attainment VARCHAR(100) NOT NULL,
    present_address TEXT NOT NULL,
    email_address VARCHAR(255),
    contact_number VARCHAR(20),
    passport_number VARCHAR(50) NOT NULL,
    passport_validity DATE NOT NULL,
    id_presented VARCHAR(100) NOT NULL,
    id_number VARCHAR(50) NOT NULL,
    with_taiwan_work_experience BOOLEAN DEFAULT FALSE,
    with_job_experience BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Taiwan Work Experience
CREATE TABLE taiwan_work_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES gov_to_gov_applications(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    year_started INTEGER NOT NULL,
    year_ended INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Experience (Other than Taiwan)
CREATE TABLE job_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES gov_to_gov_applications(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    year_started INTEGER NOT NULL,
    year_ended INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Information Sheet Records
CREATE TABLE information_sheet_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    jobsite VARCHAR(255) NOT NULL,
    name_of_agency VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('employment', 'owwa', 'legal', 'loan', 'visa', 'balik_manggagawa', 'reduced_travel_tax', 'philhealth', 'others')),
    purpose_others VARCHAR(255),
    worker_category VARCHAR(50) NOT NULL CHECK (worker_category IN ('landbased_newhire', 'rehire_balik_manggagawa', 'seafarer')),
    requested_record VARCHAR(50) NOT NULL CHECK (requested_record IN ('information_sheet', 'oec', 'employment_contract')),
    documents_presented TEXT[] NOT NULL,
    documents_others VARCHAR(255),
    time_received TIMESTAMP WITH TIME ZONE NOT NULL,
    time_released TIMESTAMP WITH TIME ZONE NOT NULL,
    total_pct INTEGER NOT NULL,
    remarks VARCHAR(50),
    remarks_others VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Actions Taken for Information Sheet
CREATE TABLE actions_taken (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES information_sheet_records(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    ofw_records_released VARCHAR(50) NOT NULL CHECK (ofw_records_released IN ('print_out', 'copy_of_original', 'digital_image', 'cert_no_record')),
    no_of_records_retrieved INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Fairs
CREATE TABLE job_fairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    office_head VARCHAR(255) NOT NULL,
    is_rescheduled BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Fair Email Addresses (for multiple email addresses)
CREATE TABLE job_fair_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_fair_id UUID NOT NULL REFERENCES job_fairs(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Fair Contact Numbers (for multiple contact numbers with categories)
CREATE TABLE job_fair_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_fair_id UUID NOT NULL REFERENCES job_fairs(id) ON DELETE CASCADE,
    contact_category VARCHAR(50) NOT NULL, -- 'Cellphone', 'Phone', 'Fax', etc.
    contact_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PESO IV-A Contact Info
CREATE TABLE peso_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province VARCHAR(100) NOT NULL,
    peso_office VARCHAR(255) NOT NULL,
    office_head VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PRAs Contact Info
CREATE TABLE pra_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_of_pras VARCHAR(255) NOT NULL,
    pra_contact_person VARCHAR(255) NOT NULL,
    office_head VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Fair Monitoring Summary
CREATE TABLE job_fair_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_of_job_fair DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    no_of_invited_agencies INTEGER NOT NULL,
    no_of_agencies_with_jfa INTEGER NOT NULL,
    male_applicants INTEGER NOT NULL,
    female_applicants INTEGER NOT NULL,
    total_applicants INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL,
    application_type VARCHAR(50) NOT NULL, -- 'direct_hire', 'gov_to_gov', etc.
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions (for secure session management)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index for email (excluding NULL values)
CREATE UNIQUE INDEX users_email_unique_idx ON users (email) WHERE email IS NOT NULL;

-- Direct Hire Documents
CREATE TABLE direct_hire_documents (
    id SERIAL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES direct_hire_applications(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_direct_hire_control_number ON direct_hire_applications(control_number);
CREATE INDEX idx_direct_hire_status ON direct_hire_applications(status);
CREATE INDEX idx_direct_hire_created_at ON direct_hire_applications(created_at);
CREATE INDEX idx_direct_hire_sex ON direct_hire_applications(sex);
CREATE INDEX idx_direct_hire_documents_completed ON direct_hire_applications(documents_completed);

CREATE INDEX idx_direct_hire_documents_application_id ON direct_hire_documents(application_id);
CREATE INDEX idx_direct_hire_documents_type ON direct_hire_documents(document_type);

CREATE INDEX idx_clearance_control_number ON balik_manggagawa_clearance(control_number);
CREATE INDEX idx_clearance_type ON balik_manggagawa_clearance(clearance_type);
CREATE INDEX idx_clearance_created_at ON balik_manggagawa_clearance(created_at);

CREATE INDEX idx_processing_or_number ON balik_manggagawa_processing(or_number);
CREATE INDEX idx_processing_created_at ON balik_manggagawa_processing(created_at);

CREATE INDEX idx_gov_to_gov_created_at ON gov_to_gov_applications(created_at);
CREATE INDEX idx_gov_to_gov_sex ON gov_to_gov_applications(sex);

CREATE INDEX idx_info_sheet_created_at ON information_sheet_records(created_at);
CREATE INDEX idx_info_sheet_purpose ON information_sheet_records(purpose);
CREATE INDEX idx_info_sheet_worker_category ON information_sheet_records(worker_category);

CREATE INDEX idx_job_fairs_date ON job_fairs(date);
CREATE INDEX idx_peso_contacts_province ON peso_contacts(province);
CREATE INDEX idx_pra_contacts_name ON pra_contacts(name_of_pras);
CREATE INDEX idx_job_fair_monitoring_date ON job_fair_monitoring(date_of_job_fair);

CREATE INDEX idx_documents_application ON documents(application_id, application_type);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_approved ON users(is_approved);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_direct_hire_applications_updated_at BEFORE UPDATE ON direct_hire_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_direct_hire_documents_updated_at BEFORE UPDATE ON direct_hire_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personal_info_updated_at BEFORE UPDATE ON personal_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employment_info_updated_at BEFORE UPDATE ON employment_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_balik_manggagawa_clearance_updated_at BEFORE UPDATE ON balik_manggagawa_clearance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_balik_manggagawa_processing_updated_at BEFORE UPDATE ON balik_manggagawa_processing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_counter_monitoring_updated_at BEFORE UPDATE ON counter_monitoring FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gov_to_gov_applications_updated_at BEFORE UPDATE ON gov_to_gov_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_information_sheet_records_updated_at BEFORE UPDATE ON information_sheet_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_fairs_updated_at BEFORE UPDATE ON job_fairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_peso_contacts_updated_at BEFORE UPDATE ON peso_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pra_contacts_updated_at BEFORE UPDATE ON pra_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_fair_monitoring_updated_at BEFORE UPDATE ON job_fair_monitoring FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default superadmin user (password should be changed in production)
INSERT INTO users (username, email, password_hash, full_name, role, is_approved) 
VALUES ('superadmin', 'superadmin@balikbayani.gov.ph', '$2b$10$default_hash_here', 'Super Administrator', 'superadmin', true);
