-- scripts/cleanup-sample-data.sql
-- Remove all records and reset control numbers
-- This script deletes all data from the main tables and related tables
-- WARNING: This will permanently delete all data!

-- ============================================================================
-- CLEANUP SCRIPT - Remove All Records
-- ============================================================================

-- Disable foreign key checks temporarily (PostgreSQL doesn't have this, but we'll delete in order)
-- Delete in order to respect foreign key constraints (child tables first)

-- 1. Delete related/child records first (respecting foreign key constraints)
DELETE FROM actions_taken;
DELETE FROM documents;
DELETE FROM direct_hire_documents;
DELETE FROM personal_info;
DELETE FROM employment_info;
DELETE FROM job_fair_emails;
DELETE FROM job_fair_contacts;
DELETE FROM taiwan_work_experience;
DELETE FROM job_experience;

-- 2. Delete main application/record tables
DELETE FROM direct_hire_applications;
DELETE FROM balik_manggagawa_clearance;
DELETE FROM gov_to_gov_applications;
DELETE FROM information_sheet_records;
DELETE FROM job_fairs;

-- 3. Reset sequences if any exist (for SERIAL columns)
-- Note: Control numbers are generated based on COUNT, so deleting records will reset them
-- But we can also reset any sequences that might exist

-- Reset direct_hire_documents sequence (if it uses SERIAL)
DO $$
BEGIN
    -- Check if sequence exists and reset it
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'direct_hire_documents_id_seq') THEN
        PERFORM setval('direct_hire_documents_id_seq', 1, false);
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION - Check that tables are empty
-- ============================================================================
DO $$
DECLARE
    direct_hire_count INTEGER;
    bm_count INTEGER;
    g2g_count INTEGER;
    info_sheet_count INTEGER;
    job_fair_count INTEGER;
    documents_count INTEGER;
    actions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO direct_hire_count FROM direct_hire_applications;
    SELECT COUNT(*) INTO bm_count FROM balik_manggagawa_clearance;
    SELECT COUNT(*) INTO g2g_count FROM gov_to_gov_applications;
    SELECT COUNT(*) INTO info_sheet_count FROM information_sheet_records;
    SELECT COUNT(*) INTO job_fair_count FROM job_fairs;
    SELECT COUNT(*) INTO documents_count FROM documents;
    SELECT COUNT(*) INTO actions_count FROM actions_taken;
    
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

