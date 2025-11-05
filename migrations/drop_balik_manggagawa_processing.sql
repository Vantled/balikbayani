-- Drop balik_manggagawa_processing and counter_monitoring tables
-- counter_monitoring has a foreign key to balik_manggagawa_processing, so drop it first

-- Drop counter_monitoring table first (it has FK to processing)
DROP TABLE IF EXISTS counter_monitoring CASCADE;

-- Drop balik_manggagawa_processing table
DROP TABLE IF EXISTS balik_manggagawa_processing CASCADE;

-- Drop related indexes if they exist
DROP INDEX IF EXISTS idx_processing_or_number;
DROP INDEX IF EXISTS idx_processing_created_at;
DROP INDEX IF EXISTS idx_bm_processing_clearance_type;
DROP INDEX IF EXISTS idx_bm_processing_clearance_id;
DROP INDEX IF EXISTS idx_bm_processing_documents_completed;
DROP INDEX IF EXISTS idx_bm_processing_completed_at;

