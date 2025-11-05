// scripts/run-drop-processing-migration.js
// Run the migration to drop balik_manggagawa_processing and counter_monitoring tables

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database connection setup
let db;

async function setupDatabase() {
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
    
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Failed to setup database connection:', error.message);
    return false;
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

async function runMigration() {
  try {
    console.log('🚀 Starting migration to drop balik_manggagawa_processing tables...\n');
    
    // Setup database connection
    const dbSetup = await setupDatabase();
    if (!dbSetup) {
      throw new Error('Database setup failed');
    }
    
    // Read and execute the migration file
    const sql = await readSqlFile('migrations/drop_balik_manggagawa_processing.sql');
    
    if (!sql) {
      throw new Error('Failed to read migration file');
    }
    
    console.log('📄 Executing migration...');
    console.log('SQL:', sql);
    
    await db.query(sql);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('✅ Dropped balik_manggagawa_processing and counter_monitoring tables');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    if (db && db.end) {
      await db.end();
    }
  }
}

// Run the migration
runMigration();

