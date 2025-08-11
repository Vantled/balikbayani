// lib/migrate-security.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { db } from './database';

// Load environment variables from .env.local
config({ path: '.env.local' });

export async function migrateSecurityFeatures() {
  try {
    console.log('Migrating security features...');

    // Add new columns to users table
    const alterUserQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
    ];

    for (const query of alterUserQueries) {
      await db.query(query);
      console.log('Executed:', query);
    }

    // Create user_sessions table
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.query(createSessionsTable);
    console.log('Created user_sessions table');

    // Create indexes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)'
    ];

    for (const query of createIndexes) {
      await db.query(query);
      console.log('Created index:', query);
    }

    console.log('Security migration completed successfully');
    return true;

  } catch (error) {
    console.error('Security migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateSecurityFeatures()
    .then(() => {
      console.log('Security migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Security migration failed:', error);
      process.exit(1);
    });
}
