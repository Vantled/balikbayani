// scripts/apply-is-first-login-migration.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/balikbayani',
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Applying is_first_login migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_is_first_login_to_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Migration applied successfully!');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(console.error);
