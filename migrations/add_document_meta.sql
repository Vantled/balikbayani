-- migrations/add_document_meta.sql
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS meta JSONB;

-- Optional indexes for frequent keys
-- CREATE INDEX IF NOT EXISTS idx_documents_meta_passport ON documents ((meta->>'passport_number'));

