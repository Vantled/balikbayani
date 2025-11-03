// scripts/init-database.js
import 'dotenv/config';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Pool } from 'pg';

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: '.env.local' });

// Import database connection dynamically
let db;
try {
  // Try ESM JS build first
  const databaseModule = await import('../lib/database.js');
  db = databaseModule.db || databaseModule.default;
} catch (errorJs) {
  try {
    // Try importing TS directly (may work if a loader is present)
    const databaseModuleTs = await import('../lib/database.ts');
    // @ts-ignore
    db = databaseModuleTs.db || databaseModuleTs.default;
  } catch (errorTs) {
    // Fallback: create a direct pg pool
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432');
    const database = process.env.DB_NAME || 'balikbayani';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';

    console.warn('Database module not found; using fallback pg Pool connection');
    const pool = new Pool({ host, port, database, user, password, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
    db = {
      query: (text, params) => pool.query(text, params),
      end: () => pool.end()
    };
  }
}

async function resetDatabaseIfRequested() {
  const shouldReset = process.argv.includes('--reset');
  if (!shouldReset) return;

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432');
  const database = process.env.DB_NAME || 'balikbayani';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';

  console.log(`\n⚠️  Reset requested: dropping and recreating database "${database}"...`);

  // Connect to the default postgres database to manage target DB
  const adminPool = new Pool({ host, port, database: 'postgres', user, password });
  try {
    // Terminate existing connections to the target database
    await adminPool.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [database]
    );

    // Drop and recreate the database (quote identifier safely)
    const dbIdent = database.replace(/"/g, '""');
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbIdent}"`);
    await adminPool.query(`CREATE DATABASE "${dbIdent}"`);
    console.log('✅ Database reset completed');
  } catch (err) {
    console.error('❌ Database reset failed:', err.message);
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

async function readSqlFile(filePath) {
  try {
    // Resolve path relative to project root
    const projectRoot = path.resolve(__dirname, '..');
    const fullPath = path.resolve(projectRoot, filePath);
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

async function executeSqlFile(filePath, description) {
  console.log(`\n📄 ${description}...`);
  const sql = await readSqlFile(filePath);
  if (sql) {
    try {
      await db.query(sql);
      console.log(`✅ ${description} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      return false;
    }
  }
  return false;
}

async function initializeDatabase() {
  try {
    console.log('🚀 Starting comprehensive database initialization...\n');

    // Optional reset step
    await resetDatabaseIfRequested();

    // Step 1: Execute main schema
    await executeSqlFile('lib/schema.sql', 'Creating main database schema');

    // Step 2: Execute all migrations in order
    const migrations = [
      { file: 'migrations/add_is_first_login_to_users.sql', desc: 'Adding is_first_login field to users' },
      { file: 'migrations/allow_null_email_for_users.sql', desc: 'Allowing NULL email for temporary users' },
      { file: 'migrations/add_salary_currency_to_direct_hire.sql', desc: 'Adding salary currency and raw salary to direct hire' },
      { file: 'migrations/add_table_last_modified_tracking.sql', desc: 'Adding table last modified tracking' },
      { file: 'migrations/add_deleted_at_to_job_fairs.sql', desc: 'Adding soft delete to job fairs' },
      { file: 'migrations/add_deleted_at_to_pra_contacts.sql', desc: 'Adding soft delete to PRA contacts' },
      { file: 'migrations/add_rescheduled_field.sql', desc: 'Adding rescheduled field to job fairs' },
      { file: 'migrations/update_job_fairs_contacts.sql', desc: 'Updating job fairs contacts structure' },
      { file: 'migrations/update_peso_contacts_multiple_fields.sql', desc: 'Updating PESO contacts for multiple fields' },
      { file: 'migrations/update_pra_contacts_multiple_fields.sql', desc: 'Updating PRA contacts for multiple fields' },
      { file: 'migrations/remove_contact_number_from_job_fairs.sql', desc: 'Removing contact number from job fairs' }
    ];

    for (const migration of migrations) {
      await executeSqlFile(migration.file, migration.desc);
    }

    // Step 3: Execute lib migrations
    const libMigrations = [
      { file: 'lib/migrate-bm-clearance-extended.sql', desc: 'Extending balik manggagawa clearance fields' },
      { file: 'lib/migrate-bm-clearance-missing-fields.sql', desc: 'Adding missing fields to BM clearance' },
      { file: 'lib/migrate-bm-clearance-status.sql', desc: 'Adding status field to BM clearance' },
      { file: 'lib/migrate-bm-processing-documents.sql', desc: 'Adding document tracking to BM processing' },
      { file: 'lib/migrate-bm-processing-clearance-link.sql', desc: 'Adding clearance link to BM processing' },
      { file: 'lib/migrate-bm-clearance-narrative.sql', desc: 'Adding narrative fields to BM clearance' },
      { file: 'lib/migrate-add-employer.sql', desc: 'Adding employer field to direct hire' },
      { file: 'lib/migrate-status-checklist.sql', desc: 'Adding status checklist to direct hire' },
      { file: 'lib/migrate-soft-delete.sql', desc: 'Adding soft delete functionality' }
    ];

    for (const migration of libMigrations) {
      await executeSqlFile(migration.file, migration.desc);
    }

    // Step 4: Create default admin user
    console.log('\n👤 Setting up default admin user...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Check if admin user exists
    const { rows: existingAdmin } = await db.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.length === 0) {
      // Create admin user if it doesn't exist
      await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_first_login) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin', 'admin@balikbayani.gov.ph', passwordHash, 'Administrator', 'admin', true, false]
      );
      console.log('✅ Default admin user created');
    } else {
      // Update existing admin user
      await db.query(
        `UPDATE users SET 
          password_hash = $1,
          email = $2,
          full_name = $3,
          role = $4,
          is_approved = $5,
          is_first_login = $6
        WHERE username = 'admin'`,
        [passwordHash, 'admin@balikbayani.gov.ph', 'Administrator', 'admin', true, false]
      );
      console.log('✅ Default admin user updated');
    }
    
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log(`   Password: ${adminPassword}`);

    // Step 5: Verify database setup
    console.log('\n🔍 Verifying database setup...');
    const { rows: tables } = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`✅ Database initialized successfully with ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Access the application at: http://localhost:3000');
    console.log('   3. Login with admin credentials above');

    return true;

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    throw error;
  } finally {
    await db.end();
  }
}

// Run initialization if this file is executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  initializeDatabase()
    .then(() => {
      console.log('\n✅ Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database setup failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase };
