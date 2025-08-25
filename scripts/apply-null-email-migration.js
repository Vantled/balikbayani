// scripts/apply-null-email-migration.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:balikbayani123@localhost:5432/balikbayani'
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Applying null email migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'allow_null_email_for_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply the migration
    await client.query(migrationSQL);
    
    console.log('✅ Null email migration applied successfully!');
    console.log('Users table now allows NULL email values for temporary users.');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(console.error);
