// lib/migrate-role-hierarchy.ts
import { db } from './database';

export async function migrateRoleHierarchy() {
  try {
    console.log('Starting role hierarchy migration...');

    // Update the users table to support new role hierarchy
    await db.query(`
      -- Update the role constraint to include superadmin
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'staff'));
      
      -- Update default role to 'staff'
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';
      
      -- Add created_by column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_by') THEN
          ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id);
        END IF;
      END $$;
    `);

    // Update existing users with role 'user' to 'staff'
    await db.query(`
      UPDATE users SET role = 'staff' WHERE role = 'user';
    `);

    // Create a superadmin user if none exists
    const superadminCheck = await db.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'superadmin';
    `);

    if (superadminCheck.rows[0].count === '0') {
      // Create default superadmin user
      await db.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_active)
        VALUES (
          'superadmin',
          'superadmin@balikbayani.gov.ph',
          '$2b$10$default_hash_here',
          'Super Administrator',
          'superadmin',
          true,
          true
        );
      `);
      console.log('Created default superadmin user');
    }

    // Update existing admin users to ensure they have proper permissions
    await db.query(`
      UPDATE users SET is_approved = true, is_active = true 
      WHERE role IN ('admin', 'superadmin') AND (is_approved = false OR is_active = false);
    `);

    console.log('Role hierarchy migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateRoleHierarchy()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
