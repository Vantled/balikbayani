-- scripts/cleanup-sample-data.sql
-- Remove all records and reset control numbers
-- This script deletes all data from the main tables and related tables
-- WARNING: This will permanently delete all data!

-- ============================================================================
-- CLEANUP SCRIPT - Remove All Records
-- ============================================================================

-- Set a longer statement timeout (2 minutes) to handle potential locks
SET statement_timeout = '120s';

-- Disable triggers temporarily to speed up operations
SET session_replication_role = 'replica';

DO $$
DECLARE
    rec_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting cleanup...';
    RAISE NOTICE 'This will delete all records from application tables.';
    RAISE NOTICE '';
    
    -- Delete from child tables first (using WHERE TRUE to avoid count check overhead)
    -- This is faster than checking count first when tables might be empty
    
    RAISE NOTICE 'Cleaning child tables...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions_taken') THEN
        DELETE FROM actions_taken WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  actions_taken: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        DELETE FROM documents WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  documents: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_hire_documents') THEN
        DELETE FROM direct_hire_documents WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  direct_hire_documents: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_info') THEN
        DELETE FROM personal_info WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  personal_info: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employment_info') THEN
        DELETE FROM employment_info WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  employment_info: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_fair_emails') THEN
        DELETE FROM job_fair_emails WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  job_fair_emails: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_fair_contacts') THEN
        DELETE FROM job_fair_contacts WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  job_fair_contacts: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taiwan_work_experience') THEN
        DELETE FROM taiwan_work_experience WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  taiwan_work_experience: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_experience') THEN
        DELETE FROM job_experience WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  job_experience: % records', rec_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Cleaning main application tables...';
    
    -- Delete from main tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_hire_applications') THEN
        DELETE FROM direct_hire_applications WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  direct_hire_applications: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'balik_manggagawa_clearance') THEN
        DELETE FROM balik_manggagawa_clearance WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  balik_manggagawa_clearance: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gov_to_gov_applications') THEN
        DELETE FROM gov_to_gov_applications WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  gov_to_gov_applications: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'information_sheet_records') THEN
        DELETE FROM information_sheet_records WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  information_sheet_records: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_fairs') THEN
        DELETE FROM job_fairs WHERE TRUE;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '  job_fairs: % records', rec_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Cleanup operations completed!';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences if any exist (for SERIAL columns)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'direct_hire_documents_id_seq') THEN
        PERFORM setval('direct_hire_documents_id_seq', 1, false);
        RAISE NOTICE 'Reset direct_hire_documents_id_seq';
    END IF;
END $$;

-- Reset statement timeout
RESET statement_timeout;

-- ============================================================================
-- VERIFICATION - Check that tables are empty
-- ============================================================================
DO $$
DECLARE
    direct_hire_count INTEGER := 0;
    bm_count INTEGER := 0;
    g2g_count INTEGER := 0;
    info_sheet_count INTEGER := 0;
    job_fair_count INTEGER := 0;
    documents_count INTEGER := 0;
    actions_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verifying cleanup...';
    
    -- Check counts only if tables exist (with shorter timeout for verification)
    SET LOCAL statement_timeout = '10s';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_hire_applications') THEN
        BEGIN
            SELECT COUNT(*) INTO direct_hire_count FROM direct_hire_applications;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify direct_hire_applications (may be locked)';
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'balik_manggagawa_clearance') THEN
        BEGIN
            SELECT COUNT(*) INTO bm_count FROM balik_manggagawa_clearance;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify balik_manggagawa_clearance (may be locked)';
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gov_to_gov_applications') THEN
        BEGIN
            SELECT COUNT(*) INTO g2g_count FROM gov_to_gov_applications;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify gov_to_gov_applications (may be locked)';
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'information_sheet_records') THEN
        BEGIN
            SELECT COUNT(*) INTO info_sheet_count FROM information_sheet_records;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify information_sheet_records (may be locked)';
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_fairs') THEN
        BEGIN
            SELECT COUNT(*) INTO job_fair_count FROM job_fairs;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify job_fairs (may be locked)';
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        BEGIN
            SELECT COUNT(*) INTO documents_count FROM documents;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify documents (may be locked)';
        END;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions_taken') THEN
        BEGIN
            SELECT COUNT(*) INTO actions_count FROM actions_taken;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  Could not verify actions_taken (may be locked)';
        END;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup Verification:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Direct Hire Applications: % records', direct_hire_count;
    RAISE NOTICE 'Balik Manggagawa Clearance: % records', bm_count;
    RAISE NOTICE 'Gov to Gov Applications: % records', g2g_count;
    RAISE NOTICE 'Information Sheet Records: % records', info_sheet_count;
    RAISE NOTICE 'Job Fairs: % records', job_fair_count;
    RAISE NOTICE 'Documents: % records', documents_count;
    RAISE NOTICE 'Actions Taken: % records', actions_count;
    RAISE NOTICE '========================================';
    
    IF direct_hire_count = 0 AND bm_count = 0 AND g2g_count = 0 AND 
       info_sheet_count = 0 AND job_fair_count = 0 AND documents_count = 0 AND actions_count = 0 THEN
        RAISE NOTICE '✅ All tables have been cleaned successfully!';
        RAISE NOTICE 'Control numbers will reset to 001-001 on next record creation.';
    ELSE
        RAISE WARNING '⚠️  Some tables still contain records. Please check manually.';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All records have been deleted from:';
    RAISE NOTICE '- Direct Hire Applications';
    RAISE NOTICE '- Balik Manggagawa Clearance';
    RAISE NOTICE '- Gov to Gov Applications';
    RAISE NOTICE '- Information Sheet Records';
    RAISE NOTICE '- Job Fairs (with emails and contacts)';
    RAISE NOTICE '- Related documents and actions';
    RAISE NOTICE '';
    RAISE NOTICE 'Control numbers will automatically reset';
    RAISE NOTICE 'to 001-001 when new records are created.';
    RAISE NOTICE '========================================';
END $$;
