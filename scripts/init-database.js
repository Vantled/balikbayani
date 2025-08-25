// scripts/init-database.js
import 'dotenv/config';
import { config } from 'dotenv';
import { db } from '../lib/database.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function readSqlFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
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

    // Step 1: Execute main schema
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    await executeSqlFile(schemaPath, 'Creating main database schema');

    // Step 2: Execute all migrations in order
    const migrations = [
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
      const migrationPath = path.join(process.cwd(), migration.file);
      await executeSqlFile(migrationPath, migration.desc);
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
      const migrationPath = path.join(process.cwd(), migration.file);
      await executeSqlFile(migrationPath, migration.desc);
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
      await db.query(
        `UPDATE users SET 
          password_hash = $1,
          email = $2,
          full_name = $3,
          role = $4,
          is_approved = $5
        WHERE username = 'admin'`,
        [passwordHash, 'admin@balikbayani.gov.ph', 'Administrator', 'admin', true]
      );
      console.log('✅ Default admin user created/updated');
      console.log('📋 Login credentials:');
      console.log('   Username: admin');
      console.log(`   Password: ${adminPassword}`);
    } else {
      console.log('✅ Admin user already exists');
    }

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
if (process.argv[1] === new URL(import.meta.url).pathname) {
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
