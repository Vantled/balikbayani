// scripts/database-manager.js
// Consolidated database management script
// Combines initialization, seeding, cleanup, and maintenance operations

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

// Database operations
async function initializeDatabase() {
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
    { file: 'migrations/add_original_date_to_job_fairs.sql', desc: 'Adding original_date field to job fairs' },
    { file: 'migrations/update_job_fairs_contacts.sql', desc: 'Updating job fairs contacts structure' },
    { file: 'migrations/update_peso_contacts_multiple_fields.sql', desc: 'Updating PESO contacts for multiple fields' },
    { file: 'migrations/update_peso_contacts_office_heads.sql', desc: 'Adding multiple office heads support to PESO contacts' },
    { file: 'migrations/update_pra_contacts_multiple_fields.sql', desc: 'Updating PRA contacts for multiple fields' },
    { file: 'migrations/update_pra_contacts_contact_persons_office_heads.sql', desc: 'Adding multiple contact persons and office heads support to PRA contacts' },
    { file: 'migrations/remove_contact_number_from_job_fairs.sql', desc: 'Removing contact number from job fairs' },
    { file: 'migrations/20250108_add_time_received_released.sql', desc: 'Adding time_received and time_released columns for process cycle time tracking' },
    { file: 'migrations/20251126_create_applicant_otp_table.sql', desc: 'Creating applicant OTP table and adding applicant role' },
    { file: 'migrations/20251126_add_applicant_user_to_direct_hire.sql', desc: 'Adding applicant_user_id to direct_hire_applications' }
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

  console.log('✅ Database initialization completed');
}

async function setupAdminUser() {
  console.log('\n👤 Setting up default admin and superadmin users...');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
  const saltRounds = 12;
  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);
  const superadminPasswordHash = await bcrypt.hash(superadminPassword, saltRounds);

  // Check if admin user exists
  const { rows: existingAdmin } = await db.query(
    'SELECT id FROM users WHERE username = $1',
    ['admin']
  );

  if (existingAdmin.length === 0) {
    // Create admin user if it doesn't exist
    await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_first_login, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['admin', 'admin@balikbayani.gov.ph', adminPasswordHash, 'Administrator', 'admin', true, false, true]
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
        is_first_login = $6,
        is_active = $7
      WHERE username = 'admin'`,
      [adminPasswordHash, 'admin@balikbayani.gov.ph', 'Administrator', 'admin', true, false, true]
    );
    console.log('✅ Default admin user updated');
  }

  // Check if superadmin user exists
  const { rows: existingSuperadmin } = await db.query(
    'SELECT id FROM users WHERE username = $1',
    ['superadmin']
  );

  if (existingSuperadmin.length === 0) {
    // Create superadmin user if it doesn't exist
    await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_first_login, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['superadmin', 'superadmin@balikbayani.gov.ph', superadminPasswordHash, 'Super Administrator', 'superadmin', true, false, true]
    );
    console.log('✅ Default superadmin user created');
  } else {
    // Update existing superadmin user
    await db.query(
      `UPDATE users SET 
        password_hash = $1,
        email = $2,
        full_name = $3,
        role = $4,
        is_approved = $5,
        is_first_login = $6,
        is_active = $7
      WHERE username = 'superadmin'`,
      [superadminPasswordHash, 'superadmin@balikbayani.gov.ph', 'Super Administrator', 'superadmin', true, false, true]
    );
    console.log('✅ Default superadmin user updated');
  }
  
  console.log('📋 Login credentials:');
  console.log('   Admin:');
  console.log('     Username: admin');
  console.log(`     Password: ${adminPassword}`);
  console.log('   Superadmin:');
  console.log('     Username: superadmin');
  console.log(`     Password: ${superadminPassword}`);
}

async function cleanupUsers() {
  console.log('\n🧹 Starting user cleanup process...');

  // Check current users
  const { rows: allUsers } = await db.query(
    'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at'
  );

  console.log(`Found ${allUsers.length} users in the database:`);
  allUsers.forEach(user => {
    console.log(`   - ${user.username} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
  });

  // Identify users to keep (admin and superadmin)
  const usersToKeep = ['admin', 'superadmin'];
  const usersToDelete = allUsers.filter(user => !usersToKeep.includes(user.username));

  if (usersToDelete.length === 0) {
    console.log('\n✅ No users to delete. Only admin and superadmin users exist.');
    return;
  }

  console.log(`\n🗑️  Users to be deleted (${usersToDelete.length}):`);
  usersToDelete.forEach(user => {
    console.log(`   - ${user.username} (${user.role})`);
  });

  // Delete users (with foreign key handling)
  console.log('\n🗑️  Deleting users...');
  
  for (const user of usersToDelete) {
    try {
      // First, delete related audit logs
      await db.query('DELETE FROM audit_logs WHERE user_id = $1', [user.id]);
      
      // Then delete the user
      await db.query('DELETE FROM users WHERE id = $1', [user.id]);
      console.log(`   ✅ Deleted: ${user.username} (${user.role})`);
    } catch (error) {
      console.error(`   ❌ Failed to delete ${user.username}:`, error.message);
    }
  }

  // Verify cleanup
  const { rows: remainingUsers } = await db.query(
    'SELECT username, role, is_active FROM users ORDER BY username'
  );

  console.log(`\n✅ Cleanup completed! ${remainingUsers.length} users remaining:`);
  remainingUsers.forEach(user => {
    console.log(`   - ${user.username} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
  });
}

async function seedSampleData() {
  console.log('\n🌱 Seeding sample data...');
  
  // Import seeding functions from the enhanced init script
  const { seedPesoContacts, seedPraContacts, seedBalikManggagawaData } = require('./init-database-alt.js');
  
  // Seed PESO contacts
  await seedPesoContacts();
  
  // Seed PRA contacts
  await seedPraContacts();
  
  // Seed Balik Manggagawa data
  await seedBalikManggagawaData();
  
  console.log('✅ Sample data seeding completed');
}

async function verifyDatabase() {
  console.log('\n🔍 Verifying database setup...');
  const { rows: tables } = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);

  console.log(`✅ Database verified with ${tables.length} tables:`);
  tables.forEach(table => {
    console.log(`   - ${table.table_name}`);
  });
}

async function showUsage() {
  console.log(`
📋 Database Manager - Usage Guide

Available commands:
  init          - Initialize database schema and run all migrations
  admin         - Setup/update admin user
  seed          - Seed sample data (PESO, PRA, Balik Manggagawa)
  cleanup       - Remove all users except admin and superadmin
  verify        - Verify database setup and show tables
  full          - Complete setup (init + admin + seed)
  reset         - Reset database (cleanup + init + admin + seed)

Examples:
  node scripts/database-manager.js init
  node scripts/database-manager.js full
  node scripts/database-manager.js cleanup
  node scripts/database-manager.js seed

Options:
  --no-seed     - Skip seeding when running full setup
  --confirm     - Confirm destructive operations (cleanup, reset)
`);
}

// Main function
async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showUsage();
    return;
  }

  try {
    // Setup database connection
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      throw new Error('Database setup failed');
    }

    switch (command) {
      case 'init':
        await initializeDatabase();
        break;
        
      case 'admin':
        await setupAdminUser();
        break;
        
      case 'seed':
        await seedSampleData();
        break;
        
      case 'cleanup':
        if (!process.argv.includes('--confirm')) {
          console.log('\n⚠️  WARNING: This will delete all users except admin and superadmin!');
          console.log('To proceed, run: node scripts/database-manager.js cleanup --confirm');
          return;
        }
        await cleanupUsers();
        break;
        
      case 'verify':
        await verifyDatabase();
        break;
        
      case 'full':
        await initializeDatabase();
        await setupAdminUser();
        if (!process.argv.includes('--no-seed')) {
          await seedSampleData();
        } else {
          console.log('\n⏭️  Skipping sample data seeding (--no-seed flag provided)');
        }
        await verifyDatabase();
        break;
        
      case 'reset':
        if (!process.argv.includes('--confirm')) {
          console.log('\n⚠️  WARNING: This will reset the entire database!');
          console.log('To proceed, run: node scripts/database-manager.js reset --confirm');
          return;
        }
        await cleanupUsers();
        await initializeDatabase();
        await setupAdminUser();
        if (!process.argv.includes('--no-seed')) {
          await seedSampleData();
        }
        await verifyDatabase();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        showUsage();
        return;
    }

    console.log('\n🎉 Operation completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Access the application at: http://localhost:3000');
    console.log('   3. Login with admin or superadmin credentials');

  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  } finally {
    if (db && db.end) {
      await db.end();
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  initializeDatabase,
  setupAdminUser,
  cleanupUsers,
  seedSampleData,
  verifyDatabase
};
