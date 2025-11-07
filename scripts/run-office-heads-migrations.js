// scripts/run-office-heads-migrations.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'balikbayani',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function runMigration(migrationFile) {
  const pool = new Pool(dbConfig);
  
  try {
    console.log(`\n📄 Running migration: ${migrationFile}`);
    console.log('Connecting to database...');
    
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, '..', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Applying migration: ${migrationFile}...`);
    
    await client.query(sql);
    
    console.log(`✅ Migration ${migrationFile} applied successfully!`);
    
    client.release();
  } catch (error) {
    console.error(`❌ Error applying migration ${migrationFile}:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runAllMigrations() {
  const migrations = [
    'migrations/update_peso_contacts_office_heads.sql',
    'migrations/update_pra_contacts_contact_persons_office_heads.sql'
  ];

  try {
    console.log('🚀 Starting office heads migrations...\n');
    console.log('Database config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: '***'
    });

    for (const migration of migrations) {
      await runMigration(migration);
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runAllMigrations();

