-- migrations/20250303_create_application_views_table.sql
-- Creates table to track which staff members have viewed which applications

CREATE TABLE IF NOT EXISTS application_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL,
  application_type VARCHAR(50) NOT NULL, -- 'direct_hire', 'balik_manggagawa', 'gov_to_gov'
  viewed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, application_type, viewed_by)
);

CREATE INDEX IF NOT EXISTS idx_application_views_application ON application_views(application_id, application_type);
CREATE INDEX IF NOT EXISTS idx_application_views_viewed_by ON application_views(viewed_by);
CREATE INDEX IF NOT EXISTS idx_application_views_viewed_at ON application_views(viewed_at DESC);

