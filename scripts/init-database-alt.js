// scripts/init-database-alt.js
// Alternative database initialization script using CommonJS for better compatibility

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Database connection setup
let db;

async function setupDatabase() {
  try {
    // Try to import the database module
    const databaseModule = require('../lib/database.ts');
    db = databaseModule.db || databaseModule.default;
    
    if (!db) {
      throw new Error('Database connection not found');
    }
    
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Failed to setup database connection:', error.message);
    console.log('💡 Trying alternative database setup...');
    
    // Fallback: Create a simple database connection
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'balikbayani',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      
      db = {
        query: (text, params) => pool.query(text, params),
        end: () => pool.end()
      };
      
      console.log('✅ Database connection established (fallback)');
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback database setup failed:', fallbackError.message);
      return false;
    }
  }
}

async function readSqlFile(filePath) {
  try {
    // Resolve path relative to project root
    const projectRoot = path.resolve(__dirname, '..');
    const fullPath = path.resolve(projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      return null;
    }
    
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
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

    // Setup database connection
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      throw new Error('Database setup failed');
    }

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
    if (db && db.end) {
      await db.end();
    }
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
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

module.exports = { initializeDatabase };
