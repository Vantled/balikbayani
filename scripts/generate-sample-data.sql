-- scripts/generate-sample-data.sql
-- Generate 1000 sample records for each table
-- This script generates realistic test data following proper validation and capitalization rules

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. DIRECT HIRE APPLICATIONS (1000 records)
-- ============================================================================
DO $$
DECLARE
    i INTEGER;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    current_day INTEGER := EXTRACT(DAY FROM CURRENT_DATE);
    month_day VARCHAR(4) := LPAD(current_month::TEXT, 2, '0') || LPAD(current_day::TEXT, 2, '0');
    monthly_count INTEGER;
    yearly_count INTEGER;
    control_num VARCHAR(50);
    first_names TEXT[] := ARRAY['MARIA', 'JOSE', 'JOHN', 'MARY', 'JUAN', 'ANA', 'CARLOS', 'ROSA', 'PEDRO', 'ELENA', 'ANTONIO', 'CARMEN', 'MANUEL', 'DOLORES', 'FRANCISCO', 'ISABEL', 'JOSE', 'MARIA', 'LUIS', 'PATRICIA', 'MIGUEL', 'GLORIA', 'RAFAEL', 'MARTHA', 'ROBERTO', 'SUSANA', 'FERNANDO', 'TERESA', 'RICARDO', 'MONICA'];
    last_names TEXT[] := ARRAY['SANTOS', 'REYES', 'CRUZ', 'BAUTISTA', 'VILLANUEVA', 'FERNANDEZ', 'RAMOS', 'GARCIA', 'TORRES', 'DELA CRUZ', 'MENDOZA', 'CASTRO', 'OROZCO', 'MORALES', 'AQUINO', 'SALAZAR', 'ROMERO', 'JIMENEZ', 'HERRERA', 'VARGAS', 'GUERRERO', 'RODRIGUEZ', 'MARTINEZ', 'LOPEZ', 'GONZALEZ', 'PEREZ', 'SANCHEZ', 'RIVERA', 'GOMEZ', 'DIAZ'];
    jobsites TEXT[] := ARRAY['HONG KONG', 'SINGAPORE', 'QATAR', 'UAE', 'SAUDI ARABIA', 'KUWAIT', 'TAIWAN', 'JAPAN', 'SOUTH KOREA', 'CANADA', 'USA', 'AUSTRALIA', 'NEW ZEALAND', 'ITALY', 'SPAIN', 'UK', 'GERMANY', 'FRANCE', 'SWITZERLAND', 'NETHERLANDS'];
    positions_professional TEXT[] := ARRAY['NURSE', 'ENGINEER', 'TEACHER', 'ACCOUNTANT', 'ARCHITECT', 'CHEF', 'PHYSICAL THERAPIST', 'OCCUPATIONAL THERAPIST', 'DENTAL HYGIENIST', 'VETERINARY TECHNICIAN', 'IT SPECIALIST', 'PROJECT MANAGER', 'SALES MANAGER', 'MARKETING MANAGER', 'HR MANAGER', 'FINANCIAL ANALYST', 'AUDITOR', 'CONSULTANT', 'SUPERVISOR', 'COORDINATOR'];
    positions_household TEXT[] := ARRAY['DOMESTIC HELPER', 'HOUSEKEEPER', 'CAREGIVER', 'NANNY', 'COOK', 'DRIVER', 'GARDENER', 'MAID', 'BABYSITTER', 'ELDERLY CAREGIVER'];
    employers TEXT[] := ARRAY['ABC EMPLOYMENT AGENCY', 'XYZ RECRUITMENT SERVICES', 'GLOBAL MANPOWER SOLUTIONS', 'WORLDWIDE STAFFING INC', 'INTERNATIONAL HIRING CORP', 'PREMIER RECRUITMENT AGENCY', 'ELITE EMPLOYMENT SERVICES', 'SUPREME MANPOWER AGENCY', 'EXCELLENCE STAFFING SOLUTIONS', 'PROFESSIONAL RECRUITMENT CORP'];
    statuses TEXT[] := ARRAY['pending', 'evaluated', 'for_confirmation', 'for_interview', 'approved'];
    currencies TEXT[] := ARRAY['USD', 'PHP', 'SAR', 'AED', 'HKD', 'SGD', 'CAD', 'AUD', 'EUR', 'GBP'];
    sex_values TEXT[] := ARRAY['male', 'female'];
    job_types TEXT[] := ARRAY['household', 'professional'];
    evaluators TEXT[] := ARRAY['JUAN DELA CRUZ', 'MARIA SANTOS', 'JOSE REYES', 'ANA GARCIA', 'CARLOS RAMOS', 'ROSA TORRES', 'PEDRO MENDOZA', 'ELENA CASTRO'];
BEGIN
    -- Get current counts - use COUNT as base, uniqueness check will handle conflicts
    SELECT COALESCE(COUNT(*), 0) INTO yearly_count 
    FROM direct_hire_applications 
    WHERE EXTRACT(YEAR FROM created_at) = current_year;
    
    SELECT COALESCE(COUNT(*), 0) INTO monthly_count 
    FROM direct_hire_applications 
    WHERE EXTRACT(YEAR FROM created_at) = current_year 
    AND EXTRACT(MONTH FROM created_at) = current_month;
    
    FOR i IN 1..1000 LOOP
        -- Increment counters
        monthly_count := monthly_count + 1;
        yearly_count := yearly_count + 1;
        
        -- Generate control number
        control_num := 'DHPSW-ROIVA-' || current_year || '-' || month_day || '-' || 
                      LPAD(monthly_count::TEXT, 3, '0') || '-' || 
                      LPAD(yearly_count::TEXT, 3, '0');
        
        -- Check if control number already exists, if so find next available
        WHILE EXISTS (SELECT 1 FROM direct_hire_applications WHERE control_number = control_num) LOOP
            monthly_count := monthly_count + 1;
            yearly_count := yearly_count + 1;
            control_num := 'DHPSW-ROIVA-' || current_year || '-' || month_day || '-' || 
                          LPAD(monthly_count::TEXT, 3, '0') || '-' || 
                          LPAD(yearly_count::TEXT, 3, '0');
        END LOOP;
        
        INSERT INTO direct_hire_applications (
            control_number, name, email, cellphone, sex, salary, salary_currency, raw_salary,
            status, jobsite, position, job_type, evaluator, employer, status_checklist,
            documents_completed, time_received, time_released, created_at, updated_at
        ) VALUES (
            control_num,
            first_names[(1 + floor(random() * array_length(first_names, 1)))::INTEGER] || ' ' ||
            (CASE WHEN random() > 0.7 THEN CHR(65 + floor(random() * 26)::INTEGER) || '. ' ELSE '' END) ||
            last_names[(1 + floor(random() * array_length(last_names, 1)))::INTEGER],
            LOWER(first_names[(1 + floor(random() * array_length(first_names, 1)))::INTEGER]) || '.' ||
            LOWER(last_names[(1 + floor(random() * array_length(last_names, 1)))::INTEGER]) || '@email.com',
            '09' || LPAD(floor(random() * 100000000)::TEXT, 9, '0'),
            sex_values[(1 + floor(random() * array_length(sex_values, 1)))::INTEGER],
            CASE 
                WHEN random() > 0.5 THEN 500 + floor(random() * 4500)::DECIMAL
                ELSE 300 + floor(random() * 200)::DECIMAL
            END,
            currencies[(1 + floor(random() * array_length(currencies, 1)))::INTEGER],
            CASE 
                WHEN random() > 0.5 THEN 500 + floor(random() * 4500)::DECIMAL
                ELSE 300 + floor(random() * 200)::DECIMAL
            END,
            statuses[(1 + floor(random() * array_length(statuses, 1)))::INTEGER],
            jobsites[(1 + floor(random() * array_length(jobsites, 1)))::INTEGER],
            CASE 
                WHEN (SELECT job_type FROM (SELECT unnest(job_types) AS job_type ORDER BY random() LIMIT 1) AS jt) = 'professional'
                THEN positions_professional[(1 + floor(random() * array_length(positions_professional, 1)))::INTEGER]
                ELSE positions_household[(1 + floor(random() * array_length(positions_household, 1)))::INTEGER]
            END,
            job_types[(1 + floor(random() * array_length(job_types, 1)))::INTEGER],
            evaluators[(1 + floor(random() * array_length(evaluators, 1)))::INTEGER],
            employers[(1 + floor(random() * array_length(employers, 1)))::INTEGER],
            '{"evaluated": {"checked": false, "timestamp": null}, "for_confirmation": {"checked": false, "timestamp": null}, "emailed_to_dhad": {"checked": false, "timestamp": null}, "received_from_dhad": {"checked": false, "timestamp": null}, "for_interview": {"checked": false, "timestamp": null}}'::jsonb,
            CASE WHEN random() > 0.7 THEN TRUE ELSE FALSE END,
            CASE WHEN random() > 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 30) ELSE NULL END,
            CASE WHEN random() > 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 hour' * floor(random() * 24) ELSE NULL END,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365),
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365)
        );
    END LOOP;
    
    RAISE NOTICE 'Generated 1000 Direct Hire Applications';
END $$;

-- ============================================================================
-- 2. BALIK MANGGAWA CLEARANCE (1000 records)
-- ============================================================================
DO $$
DECLARE
    i INTEGER;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    current_day INTEGER := EXTRACT(DAY FROM CURRENT_DATE);
    month_day VARCHAR(4) := LPAD(current_month::TEXT, 2, '0') || LPAD(current_day::TEXT, 2, '0');
    monthly_count INTEGER;
    yearly_count INTEGER;
    control_num VARCHAR(50);
    prefix VARCHAR(10);
    delimiter VARCHAR(2);
    first_names TEXT[] := ARRAY['MARIA', 'JOSE', 'JOHN', 'MARY', 'JUAN', 'ANA', 'CARLOS', 'ROSA', 'PEDRO', 'ELENA', 'ANTONIO', 'CARMEN', 'MANUEL', 'DOLORES', 'FRANCISCO', 'ISABEL', 'JOSE', 'MARIA', 'LUIS', 'PATRICIA', 'MIGUEL', 'GLORIA', 'RAFAEL', 'MARTHA', 'ROBERTO', 'SUSANA', 'FERNANDO', 'TERESA', 'RICARDO', 'MONICA'];
    last_names TEXT[] := ARRAY['SANTOS', 'REYES', 'CRUZ', 'BAUTISTA', 'VILLANUEVA', 'FERNANDEZ', 'RAMOS', 'GARCIA', 'TORRES', 'DELA CRUZ', 'MENDOZA', 'CASTRO', 'OROZCO', 'MORALES', 'AQUINO', 'SALAZAR', 'ROMERO', 'JIMENEZ', 'HERRERA', 'VARGAS', 'GUERRERO', 'RODRIGUEZ', 'MARTINEZ', 'LOPEZ', 'GONZALEZ', 'PEREZ', 'SANCHEZ', 'RIVERA', 'GOMEZ', 'DIAZ'];
    destinations TEXT[] := ARRAY['HONG KONG', 'SINGAPORE', 'QATAR', 'UAE', 'SAUDI ARABIA', 'KUWAIT', 'TAIWAN', 'JAPAN', 'SOUTH KOREA', 'CANADA', 'USA', 'AUSTRALIA', 'NEW ZEALAND', 'ITALY', 'SPAIN', 'UK', 'GERMANY', 'FRANCE', 'SWITZERLAND', 'NETHERLANDS'];
    positions TEXT[] := ARRAY['NURSE', 'ENGINEER', 'TEACHER', 'ACCOUNTANT', 'DOMESTIC HELPER', 'CAREGIVER', 'CHEF', 'PHYSICAL THERAPIST', 'IT SPECIALIST', 'PROJECT MANAGER', 'SALES MANAGER', 'SUPERVISOR', 'COORDINATOR', 'DRIVER', 'GARDENER', 'MAID', 'BABYSITTER', 'ELDERLY CAREGIVER', 'DENTAL HYGIENIST', 'VETERINARY TECHNICIAN'];
    employers TEXT[] := ARRAY['ABC EMPLOYMENT AGENCY', 'XYZ RECRUITMENT SERVICES', 'GLOBAL MANPOWER SOLUTIONS', 'WORLDWIDE STAFFING INC', 'INTERNATIONAL HIRING CORP', 'PREMIER RECRUITMENT AGENCY', 'ELITE EMPLOYMENT SERVICES', 'SUPREME MANPOWER AGENCY', 'EXCELLENCE STAFFING SOLUTIONS', 'PROFESSIONAL RECRUITMENT CORP'];
    clearance_types TEXT[] := ARRAY[NULL, 'watchlisted_employer', 'seafarer_position', 'non_compliant_country', 'no_verified_contract', 'for_assessment_country', 'critical_skill', 'watchlisted_similar_name'];
    statuses TEXT[] := ARRAY['pending', 'for_approval', 'for_clearance', 'approved', 'rejected', 'finished'];
    currencies TEXT[] := ARRAY['USD', 'PHP', 'SAR', 'AED', 'HKD', 'SGD', 'CAD', 'AUD', 'EUR', 'GBP'];
    sex_values TEXT[] := ARRAY['male', 'female'];
    job_types TEXT[] := ARRAY['household', 'professional'];
    selected_clearance_type TEXT;
    bm_count INTEGER := 0;
    we_count INTEGER := 0;
    sp_count INTEGER := 0;
    ncc_count INTEGER := 0;
    nvec_count INTEGER := 0;
    fac_count INTEGER := 0;
    cs_count INTEGER := 0;
    wsn_count INTEGER := 0;
    bm_yearly INTEGER := 0;
    we_yearly INTEGER := 0;
    sp_yearly INTEGER := 0;
    ncc_yearly INTEGER := 0;
    nvec_yearly INTEGER := 0;
    fac_yearly INTEGER := 0;
    cs_yearly INTEGER := 0;
    wsn_yearly INTEGER := 0;
BEGIN
    -- Get initial counts - use COUNT as base, but uniqueness check will handle conflicts
    -- This is simpler and more reliable than trying to parse control numbers
    SELECT COALESCE(COUNT(*), 0) INTO bm_yearly FROM balik_manggagawa_clearance WHERE clearance_type IS NULL AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO bm_count FROM balik_manggagawa_clearance WHERE clearance_type IS NULL AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO we_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'watchlisted_employer' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO we_count FROM balik_manggagawa_clearance WHERE clearance_type = 'watchlisted_employer' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO sp_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'seafarer_position' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO sp_count FROM balik_manggagawa_clearance WHERE clearance_type = 'seafarer_position' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO ncc_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'non_compliant_country' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO ncc_count FROM balik_manggagawa_clearance WHERE clearance_type = 'non_compliant_country' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO nvec_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'no_verified_contract' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO nvec_count FROM balik_manggagawa_clearance WHERE clearance_type = 'no_verified_contract' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO fac_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'for_assessment_country' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO fac_count FROM balik_manggagawa_clearance WHERE clearance_type = 'for_assessment_country' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO cs_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'critical_skill' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO cs_count FROM balik_manggagawa_clearance WHERE clearance_type = 'critical_skill' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    SELECT COALESCE(COUNT(*), 0) INTO wsn_yearly FROM balik_manggagawa_clearance WHERE clearance_type = 'watchlisted_similar_name' AND EXTRACT(YEAR FROM created_at) = current_year;
    SELECT COALESCE(COUNT(*), 0) INTO wsn_count FROM balik_manggagawa_clearance WHERE clearance_type = 'watchlisted_similar_name' AND EXTRACT(YEAR FROM created_at) = current_year AND EXTRACT(MONTH FROM created_at) = current_month;
    
    FOR i IN 1..1000 LOOP
        selected_clearance_type := clearance_types[(1 + floor(random() * array_length(clearance_types, 1)))::INTEGER];
        
        -- Determine prefix, delimiter, and get counts based on clearance type
        IF selected_clearance_type IS NULL THEN
            prefix := 'BM';
            delimiter := '-';
            bm_count := bm_count + 1;
            bm_yearly := bm_yearly + 1;
            monthly_count := bm_count;
            yearly_count := bm_yearly;
        ELSIF selected_clearance_type = 'watchlisted_employer' THEN
            prefix := 'WE';
            delimiter := ' ';
            we_count := we_count + 1;
            we_yearly := we_yearly + 1;
            monthly_count := we_count;
            yearly_count := we_yearly;
        ELSIF selected_clearance_type = 'seafarer_position' THEN
            prefix := 'SP';
            delimiter := '-';
            sp_count := sp_count + 1;
            sp_yearly := sp_yearly + 1;
            monthly_count := sp_count;
            yearly_count := sp_yearly;
        ELSIF selected_clearance_type = 'non_compliant_country' THEN
            prefix := 'NCC';
            delimiter := ' ';
            ncc_count := ncc_count + 1;
            ncc_yearly := ncc_yearly + 1;
            monthly_count := ncc_count;
            yearly_count := ncc_yearly;
        ELSIF selected_clearance_type = 'no_verified_contract' THEN
            prefix := 'NVEC';
            delimiter := '-';
            nvec_count := nvec_count + 1;
            nvec_yearly := nvec_yearly + 1;
            monthly_count := nvec_count;
            yearly_count := nvec_yearly;
        ELSIF selected_clearance_type = 'for_assessment_country' THEN
            prefix := 'FAC';
            delimiter := ' ';
            fac_count := fac_count + 1;
            fac_yearly := fac_yearly + 1;
            monthly_count := fac_count;
            yearly_count := fac_yearly;
        ELSIF selected_clearance_type = 'critical_skill' THEN
            prefix := 'CS';
            delimiter := '-';
            cs_count := cs_count + 1;
            cs_yearly := cs_yearly + 1;
            monthly_count := cs_count;
            yearly_count := cs_yearly;
        ELSIF selected_clearance_type = 'watchlisted_similar_name' THEN
            prefix := 'WSN';
            delimiter := '-';
            wsn_count := wsn_count + 1;
            wsn_yearly := wsn_yearly + 1;
            monthly_count := wsn_count;
            yearly_count := wsn_yearly;
        END IF;
        
        control_num := prefix || delimiter || current_year || '-' || month_day || '-' || 
                      LPAD(monthly_count::TEXT, 3, '0') || '-' || 
                      LPAD(yearly_count::TEXT, 3, '0');
        
        -- Check if control number already exists, if so find next available
        WHILE EXISTS (SELECT 1 FROM balik_manggagawa_clearance WHERE control_number = control_num) LOOP
            monthly_count := monthly_count + 1;
            yearly_count := yearly_count + 1;
            control_num := prefix || delimiter || current_year || '-' || month_day || '-' || 
                          LPAD(monthly_count::TEXT, 3, '0') || '-' || 
                          LPAD(yearly_count::TEXT, 3, '0');
        END LOOP;
        
        INSERT INTO balik_manggagawa_clearance (
            control_number, name_of_worker, sex, employer, destination, salary, raw_salary, salary_currency,
            job_type, position, clearance_type, status, evaluator, time_received, time_released, created_at, updated_at
        ) VALUES (
            control_num,
            first_names[(1 + floor(random() * array_length(first_names, 1)))::INTEGER] || ' ' ||
            (CASE WHEN random() > 0.7 THEN CHR(65 + floor(random() * 26)::INTEGER) || '. ' ELSE '' END) ||
            last_names[(1 + floor(random() * array_length(last_names, 1)))::INTEGER],
            sex_values[(1 + floor(random() * array_length(sex_values, 1)))::INTEGER],
            employers[(1 + floor(random() * array_length(employers, 1)))::INTEGER],
            destinations[(1 + floor(random() * array_length(destinations, 1)))::INTEGER],
            CASE 
                WHEN random() > 0.5 THEN 500 + floor(random() * 4500)::DECIMAL
                ELSE 300 + floor(random() * 200)::DECIMAL
            END,
            CASE 
                WHEN random() > 0.5 THEN 500 + floor(random() * 4500)::DECIMAL
                ELSE 300 + floor(random() * 200)::DECIMAL
            END,
            currencies[(1 + floor(random() * array_length(currencies, 1)))::INTEGER],
            job_types[(1 + floor(random() * array_length(job_types, 1)))::INTEGER],
            positions[(1 + floor(random() * array_length(positions, 1)))::INTEGER],
            selected_clearance_type,
            statuses[(1 + floor(random() * array_length(statuses, 1)))::INTEGER],
            'JUAN DELA CRUZ',
            CASE WHEN random() > 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 30) ELSE NULL END,
            CASE WHEN random() > 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 hour' * floor(random() * 24) ELSE NULL END,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365),
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365)
        );
    END LOOP;
    
    RAISE NOTICE 'Generated 1000 Balik Manggagawa Clearance records';
END $$;

-- ============================================================================
-- 3. GOV TO GOV APPLICATIONS (1000 records)
-- ============================================================================
DO $$
DECLARE
    i INTEGER;
    first_names TEXT[] := ARRAY['MARIA', 'JOSE', 'JOHN', 'MARY', 'JUAN', 'ANA', 'CARLOS', 'ROSA', 'PEDRO', 'ELENA', 'ANTONIO', 'CARMEN', 'MANUEL', 'DOLORES', 'FRANCISCO', 'ISABEL', 'JOSE', 'MARIA', 'LUIS', 'PATRICIA', 'MIGUEL', 'GLORIA', 'RAFAEL', 'MARTHA', 'ROBERTO', 'SUSANA', 'FERNANDO', 'TERESA', 'RICARDO', 'MONICA'];
    last_names TEXT[] := ARRAY['SANTOS', 'REYES', 'CRUZ', 'BAUTISTA', 'VILLANUEVA', 'FERNANDEZ', 'RAMOS', 'GARCIA', 'TORRES', 'DELA CRUZ', 'MENDOZA', 'CASTRO', 'OROZCO', 'MORALES', 'AQUINO', 'SALAZAR', 'ROMERO', 'JIMENEZ', 'HERRERA', 'VARGAS', 'GUERRERO', 'RODRIGUEZ', 'MARTINEZ', 'LOPEZ', 'GONZALEZ', 'PEREZ', 'SANCHEZ', 'RIVERA', 'GOMEZ', 'DIAZ'];
    middle_names TEXT[] := ARRAY['CRUZ', 'REYES', 'SANTOS', 'GARCIA', 'RAMOS', 'TORRES', 'MENDOZA', 'CASTRO', 'MORALES', 'AQUINO', NULL, NULL, NULL];
    educational_attainments TEXT[] := ARRAY['ELEMENTARY', 'HIGH SCHOOL', 'VOCATIONAL', 'COLLEGE', 'BACHELORS DEGREE', 'MASTERS DEGREE', 'DOCTORATE'];
    id_presented_options TEXT[] := ARRAY['PASSPORT', 'DRIVERS LICENSE', 'SSS ID', 'TIN ID', 'PHILHEALTH ID', 'POSTAL ID', 'VOTERS ID', 'PRC ID'];
    sex_values TEXT[] := ARRAY['male', 'female'];
    birth_date DATE;
    age_val INTEGER;
    height_val INTEGER;
    weight_val INTEGER;
    passport_num VARCHAR(50);
    id_num VARCHAR(50);
    taiwan_companies TEXT[] := ARRAY['TAIWAN TECH CORP', 'ASIA MANUFACTURING LTD', 'TAIPEI SERVICES INC', 'FORMOSA INDUSTRIES', 'TAIWAN LOGISTICS CO'];
    other_companies TEXT[] := ARRAY['GLOBAL SERVICES INC', 'INTERNATIONAL CORP', 'WORLDWIDE ENTERPRISES', 'PREMIER COMPANY LTD', 'ELITE BUSINESS CORP'];
BEGIN
    FOR i IN 1..1000 LOOP
        -- Generate realistic birth date (age between 20-60)
        age_val := 20 + floor(random() * 41)::INTEGER;
        birth_date := CURRENT_DATE - (age_val || ' years')::INTERVAL - (floor(random() * 365) || ' days')::INTERVAL;
        
        -- Generate height (150-180 cm) and weight (45-90 kg)
        height_val := 150 + floor(random() * 31)::INTEGER;
        weight_val := 45 + floor(random() * 46)::INTEGER;
        
        -- Generate passport number (format: P12345678)
        passport_num := 'P' || LPAD(floor(random() * 99999999)::TEXT, 8, '0');
        
        -- Generate ID number
        id_num := LPAD(floor(random() * 999999999)::TEXT, 9, '0');
        
        INSERT INTO gov_to_gov_applications (
            last_name, first_name, middle_name, sex, date_of_birth, age, height, weight,
            educational_attainment, present_address, email_address, contact_number,
            passport_number, passport_validity, id_presented, id_number,
            with_taiwan_work_experience, with_job_experience,
            taiwan_company, taiwan_year_started, taiwan_year_ended,
            other_company, other_year_started, other_year_ended,
            date_received_by_region, remarks, time_received, time_released,
            created_at, updated_at
        ) VALUES (
            last_names[(1 + floor(random() * array_length(last_names, 1)))::INTEGER],
            first_names[(1 + floor(random() * array_length(first_names, 1)))::INTEGER],
            middle_names[(1 + floor(random() * array_length(middle_names, 1)))::INTEGER],
            sex_values[(1 + floor(random() * array_length(sex_values, 1)))::INTEGER],
            birth_date,
            age_val,
            height_val,
            weight_val,
            educational_attainments[(1 + floor(random() * array_length(educational_attainments, 1)))::INTEGER],
            'BLOCK ' || (1 + floor(random() * 100))::TEXT || ', LOT ' || (1 + floor(random() * 50))::TEXT || ', ' ||
            (ARRAY['QUEZON CITY', 'MANILA', 'MAKATI', 'PASIG', 'MANDALUYONG', 'SAN JUAN', 'MARIKINA', 'LAS PINAS', 'PARANAQUE', 'MUNTINLUPA'])[(1 + floor(random() * 10))::INTEGER] || ', METRO MANILA',
            LOWER(first_names[(1 + floor(random() * array_length(first_names, 1)))::INTEGER]) || '.' ||
            LOWER(last_names[(1 + floor(random() * array_length(last_names, 1)))::INTEGER]) || '@email.com',
            '09' || LPAD(floor(random() * 100000000)::TEXT, 9, '0'),
            passport_num,
            birth_date + INTERVAL '10 years' + (floor(random() * 365) || ' days')::INTERVAL,
            id_presented_options[(1 + floor(random() * array_length(id_presented_options, 1)))::INTEGER],
            id_num,
            CASE WHEN random() > 0.6 THEN TRUE ELSE FALSE END,
            CASE WHEN random() > 0.5 THEN TRUE ELSE FALSE END,
            CASE WHEN random() > 0.6 THEN taiwan_companies[(1 + floor(random() * array_length(taiwan_companies, 1)))::INTEGER] ELSE NULL END,
            CASE WHEN random() > 0.6 THEN 2015 + floor(random() * 8)::INTEGER ELSE NULL END,
            CASE WHEN random() > 0.6 THEN 2020 + floor(random() * 5)::INTEGER ELSE NULL END,
            CASE WHEN random() > 0.5 THEN other_companies[(1 + floor(random() * array_length(other_companies, 1)))::INTEGER] ELSE NULL END,
            CASE WHEN random() > 0.5 THEN 2010 + floor(random() * 10)::INTEGER ELSE NULL END,
            CASE WHEN random() > 0.5 THEN 2015 + floor(random() * 10)::INTEGER ELSE NULL END,
            CASE WHEN random() > 0.3 THEN CURRENT_DATE - INTERVAL '1 day' * floor(random() * 90) ELSE NULL END,
            CASE WHEN random() > 0.7 THEN 'REMARKS ' || i::TEXT ELSE NULL END,
            CASE WHEN random() > 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 30) ELSE NULL END,
            CASE WHEN random() > 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 hour' * floor(random() * 24) ELSE NULL END,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365),
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365)
        );
    END LOOP;
    
    RAISE NOTICE 'Generated 1000 Gov to Gov Applications';
END $$;

-- ============================================================================
-- 4. INFORMATION SHEET RECORDS (1000 records)
-- ============================================================================
DO $$
DECLARE
    i INTEGER;
    first_names TEXT[] := ARRAY['MARIA', 'JOSE', 'JOHN', 'MARY', 'JUAN', 'ANA', 'CARLOS', 'ROSA', 'PEDRO', 'ELENA', 'ANTONIO', 'CARMEN', 'MANUEL', 'DOLORES', 'FRANCISCO', 'ISABEL', 'JOSE', 'MARIA', 'LUIS', 'PATRICIA', 'MIGUEL', 'GLORIA', 'RAFAEL', 'MARTHA', 'ROBERTO', 'SUSANA', 'FERNANDO', 'TERESA', 'RICARDO', 'MONICA'];
    last_names TEXT[] := ARRAY['SANTOS', 'REYES', 'CRUZ', 'BAUTISTA', 'VILLANUEVA', 'FERNANDEZ', 'RAMOS', 'GARCIA', 'TORRES', 'DELA CRUZ', 'MENDOZA', 'CASTRO', 'OROZCO', 'MORALES', 'AQUINO', 'SALAZAR', 'ROMERO', 'JIMENEZ', 'HERRERA', 'VARGAS', 'GUERRERO', 'RODRIGUEZ', 'MARTINEZ', 'LOPEZ', 'GONZALEZ', 'PEREZ', 'SANCHEZ', 'RIVERA', 'GOMEZ', 'DIAZ'];
    middle_names TEXT[] := ARRAY['CRUZ', 'REYES', 'SANTOS', 'GARCIA', 'RAMOS', 'TORRES', 'MENDOZA', 'CASTRO', 'MORALES', 'AQUINO', NULL, NULL, NULL];
    jobsites TEXT[] := ARRAY['HONG KONG', 'SINGAPORE', 'QATAR', 'UAE', 'SAUDI ARABIA', 'KUWAIT', 'TAIWAN', 'JAPAN', 'SOUTH KOREA', 'CANADA', 'USA', 'AUSTRALIA', 'NEW ZEALAND', 'ITALY', 'SPAIN', 'UK', 'GERMANY', 'FRANCE', 'SWITZERLAND', 'NETHERLANDS'];
    agencies TEXT[] := ARRAY['ABC EMPLOYMENT AGENCY', 'XYZ RECRUITMENT SERVICES', 'GLOBAL MANPOWER SOLUTIONS', 'WORLDWIDE STAFFING INC', 'INTERNATIONAL HIRING CORP', 'PREMIER RECRUITMENT AGENCY', 'ELITE EMPLOYMENT SERVICES', 'SUPREME MANPOWER AGENCY', 'EXCELLENCE STAFFING SOLUTIONS', 'PROFESSIONAL RECRUITMENT CORP'];
    purposes TEXT[] := ARRAY['employment', 'owwa', 'legal', 'loan', 'visa', 'balik_manggagawa', 'reduced_travel_tax', 'philhealth', 'others'];
    worker_categories TEXT[] := ARRAY['landbased_newhire', 'rehire_balik_manggagawa', 'seafarer'];
    requested_records TEXT[] := ARRAY['information_sheet', 'oec', 'employment_contract'];
    documents_options TEXT[] := ARRAY['passport', 'contract', 'oec', 'visa', 'employment_certificate', 'id'];
    remarks_options TEXT[] := ARRAY['completed', 'pending', 'incomplete', NULL];
    gender_values TEXT[] := ARRAY['male', 'female'];
    time_received TIMESTAMP WITH TIME ZONE;
    time_released TIMESTAMP WITH TIME ZONE;
    selected_docs TEXT[];
    num_docs INTEGER;
    j INTEGER;
BEGIN
    FOR i IN 1..1000 LOOP
        time_received := CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 30) - INTERVAL '1 hour' * floor(random() * 8);
        time_released := time_received + INTERVAL '1 hour' * (1 + floor(random() * 4));
        
        -- Generate documents_presented array (2-5 documents)
        num_docs := 2 + floor(random() * 4)::INTEGER;
        selected_docs := ARRAY[]::TEXT[];
        FOR j IN 1..num_docs LOOP
            selected_docs := array_append(selected_docs, documents_options[(1 + floor(random() * array_length(documents_options, 1)))::INTEGER]);
        END LOOP;
        
        INSERT INTO information_sheet_records (
            family_name, first_name, middle_name, gender, jobsite, name_of_agency,
            purpose, purpose_others, worker_category, requested_record,
            documents_presented, documents_others, time_received, time_released,
            total_pct, remarks, remarks_others, created_at, updated_at
        ) VALUES (
            last_names[(1 + floor(random() * array_length(last_names, 1)))::INTEGER],
            first_names[(1 + floor(random() * array_length(first_names, 1)))::INTEGER],
            middle_names[(1 + floor(random() * array_length(middle_names, 1)))::INTEGER],
            gender_values[(1 + floor(random() * array_length(gender_values, 1)))::INTEGER],
            jobsites[(1 + floor(random() * array_length(jobsites, 1)))::INTEGER],
            agencies[(1 + floor(random() * array_length(agencies, 1)))::INTEGER],
            purposes[(1 + floor(random() * array_length(purposes, 1)))::INTEGER],
            CASE WHEN random() > 0.8 THEN 'OTHER PURPOSE ' || i::TEXT ELSE NULL END,
            worker_categories[(1 + floor(random() * array_length(worker_categories, 1)))::INTEGER],
            requested_records[(1 + floor(random() * array_length(requested_records, 1)))::INTEGER],
            selected_docs,
            CASE WHEN random() > 0.8 THEN 'OTHER DOCUMENT ' || i::TEXT ELSE NULL END,
            time_received,
            time_released,
            50 + floor(random() * 51)::INTEGER, -- total_pct between 50-100
            remarks_options[(1 + floor(random() * array_length(remarks_options, 1)))::INTEGER],
            CASE WHEN random() > 0.7 THEN 'ADDITIONAL REMARKS ' || i::TEXT ELSE NULL END,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365),
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 365)
        );
    END LOOP;
    
    RAISE NOTICE 'Generated 1000 Information Sheet Records';
END $$;

-- ============================================================================
-- 5. JOB FAIRS (1000 records)
-- ============================================================================
DO $$
DECLARE
    i INTEGER;
    venues TEXT[] := ARRAY['SM MEGAMALL', 'SM NORTH EDSA', 'ROBINSONS GALLERIA', 'AYALA MALLS', 'TRINOMA', 'GREENBELT', 'GLORIETTA', 'MARKET MARKET', 'FESTIVAL MALL', 'ALABANG TOWN CENTER', 'EASTWOOD MALL', 'BONIFACIO GLOBAL CITY', 'ORTIGAS CENTER', 'MAKATI BUSINESS DISTRICT', 'QUEZON MEMORIAL CIRCLE', 'RIZAL PARK', 'LUNETA PARK', 'PHILIPPINE SPORTS ARENA', 'WORLD TRADE CENTER', 'PICC'];
    office_heads TEXT[] := ARRAY['JUAN DELA CRUZ', 'MARIA SANTOS', 'JOSE REYES', 'ANA GARCIA', 'CARLOS RAMOS', 'ROSA TORRES', 'PEDRO MENDOZA', 'ELENA CASTRO', 'ANTONIO VILLANUEVA', 'CARMEN FERNANDEZ'];
    email_domains TEXT[] := ARRAY['@dmw.gov.ph', '@peso.gov.ph', '@dole.gov.ph'];
    contact_categories TEXT[] := ARRAY['Cellphone', 'Phone', 'Fax'];
    fair_date DATE;
    original_date_val DATE;
    is_rescheduled_val BOOLEAN;
    num_emails INTEGER;
    num_contacts INTEGER;
    j INTEGER;
    job_fair_id UUID;
BEGIN
    FOR i IN 1..1000 LOOP
        -- Generate date (past 2 years to future 1 year)
        fair_date := CURRENT_DATE - INTERVAL '1 day' * floor(random() * 730) + INTERVAL '1 day' * floor(random() * 365);
        
        is_rescheduled_val := CASE WHEN random() > 0.8 THEN TRUE ELSE FALSE END;
        original_date_val := CASE WHEN is_rescheduled_val THEN fair_date - INTERVAL '1 day' * (1 + floor(random() * 30)) ELSE NULL END;
        
        INSERT INTO job_fairs (
            date, venue, office_head, is_rescheduled, original_date, created_at, updated_at
        ) VALUES (
            fair_date,
            venues[(1 + floor(random() * array_length(venues, 1)))::INTEGER],
            office_heads[(1 + floor(random() * array_length(office_heads, 1)))::INTEGER],
            is_rescheduled_val,
            original_date_val,
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 730),
            CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 730)
        ) RETURNING id INTO job_fair_id;
        
        -- Add 1-3 email addresses
        num_emails := 1 + floor(random() * 3)::INTEGER;
        FOR j IN 1..num_emails LOOP
            INSERT INTO job_fair_emails (job_fair_id, email_address, created_at, updated_at)
            VALUES (
                job_fair_id,
                'jobfair' || i::TEXT || j::TEXT || email_domains[(1 + floor(random() * array_length(email_domains, 1)))::INTEGER],
                CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 730),
                CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 730)
            );
        END LOOP;
        
        -- Add 1-3 contact numbers
        num_contacts := 1 + floor(random() * 3)::INTEGER;
        FOR j IN 1..num_contacts LOOP
            INSERT INTO job_fair_contacts (job_fair_id, contact_category, contact_number, created_at, updated_at)
            VALUES (
                job_fair_id,
                contact_categories[(1 + floor(random() * array_length(contact_categories, 1)))::INTEGER],
                CASE 
                    WHEN random() > 0.5 THEN '09' || LPAD(floor(random() * 100000000)::TEXT, 9, '0')
                    ELSE '02' || LPAD(floor(random() * 10000000)::TEXT, 7, '0')
                END,
                CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 730),
                CURRENT_TIMESTAMP - INTERVAL '1 day' * floor(random() * 730)
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated 1000 Job Fairs with emails and contacts';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sample Data Generation Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Direct Hire Applications: 1000 records';
    RAISE NOTICE 'Balik Manggagawa Clearance: 1000 records';
    RAISE NOTICE 'Gov to Gov Applications: 1000 records';
    RAISE NOTICE 'Information Sheet Records: 1000 records';
    RAISE NOTICE 'Job Fairs: 1000 records (with emails and contacts)';
    RAISE NOTICE '========================================';
END $$;

