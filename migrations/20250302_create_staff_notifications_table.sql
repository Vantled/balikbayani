-- migrations/20250302_create_staff_notifications_table.sql
-- Creates notifications table for staff notifications

CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'correction_resubmitted', 'status_change', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  application_type VARCHAR(50), -- 'direct_hire', 'balik_manggagawa', 'gov_to_gov'
  application_id UUID, -- Reference to the application
  field_key VARCHAR(255), -- For correction-related notifications, which field was corrected
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_id ON staff_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_is_read ON staff_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_created_at ON staff_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_unread ON staff_notifications(user_id, is_read) WHERE is_read = FALSE;

