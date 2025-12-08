-- migrations/20250108_create_notifications_table.sql
-- Creates notifications table for applicant notifications

CREATE TABLE IF NOT EXISTS applicant_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'status_change', 'application_deleted'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  application_type VARCHAR(50), -- 'direct_hire', 'balik_manggagawa', 'gov_to_gov'
  application_id UUID, -- Reference to the application
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON applicant_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON applicant_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON applicant_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON applicant_notifications(user_id, is_read) WHERE is_read = FALSE;



