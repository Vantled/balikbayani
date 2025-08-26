// scripts/run-single-migration.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: '5432',
  database: 'balikbayani',
  user: 'postgres',
  password: 'balikbayani123'
};

async function runMigration(migrationFile) {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('Connecting to database...');
    console.log('Database config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: '***'
    });
    
    const client = await pool.connect();
    console.log('Connected to database successfully!');
    
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, '..', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Applying migration: ${migrationFile}...`);
    console.log('SQL:', sql);
    
    const result = await client.query(sql);
    console.log('Migration result:', result);
    
    console.log('Migration applied successfully!');
    
    client.release();
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please provide a migration file path');
  process.exit(1);
}

runMigration(migrationFile);
