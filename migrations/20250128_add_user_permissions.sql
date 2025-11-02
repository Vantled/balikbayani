-- Add user permissions table for granular access control
-- This allows admin and superadmin to control what pages users can access

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT true,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_key)
);

-- Add indexes for better performance
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_key ON user_permissions(permission_key);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_permissions_updated_at();

-- Insert default permissions for existing users
-- All existing users get full access by default
INSERT INTO user_permissions (user_id, permission_key, granted_by)
SELECT 
    u.id,
    perm.permission_key,
    u.id -- granted by themselves initially
FROM users u
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('direct_hire'),
        ('balik_manggagawa'),
        ('gov_to_gov'),
        ('information_sheet'),
        ('job_fairs'),
        ('data_backups')
) AS perm(permission_key)
WHERE u.is_active = true;

-- Add comment explaining the permission system
COMMENT ON TABLE user_permissions IS 'Controls granular page access permissions for users. Admin and superadmin can grant/revoke access to specific pages.';
COMMENT ON COLUMN user_permissions.permission_key IS 'The permission identifier (e.g., dashboard, direct_hire, etc.)';
COMMENT ON COLUMN user_permissions.granted IS 'Whether the permission is granted (true) or denied (false)';
