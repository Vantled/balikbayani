// scripts/run-cleanup.js
// Run the cleanup SQL script using the database connection from .env.local

const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const readline = require('readline');

// Load environment variables from .env.local
config({ path: '.env.local' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'balikbayani',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runCleanupScript() {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the following tables:');
    console.log('   - Direct Hire Applications');
    console.log('   - Balik Manggagawa Clearance');
    console.log('   - Gov to Gov Applications');
    console.log('   - Information Sheet Records');
    console.log('   - Job Fairs (with emails and contacts)');
    console.log('   - Related documents and actions');
    console.log('');
    console.log('📊 Connecting to database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log('');
    
    // Ask for confirmation
    const answer = await question('Are you sure you want to proceed? Type "YES" to confirm: ');
    
    if (answer.trim().toUpperCase() !== 'YES') {
      console.log('\n❌ Cleanup cancelled. No data was deleted.');
      return;
    }
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'cleanup-sample-data.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('\n🗑️  Executing cleanup script...');
    console.log('   This may take a moment...\n');
    
    // Execute the SQL script
    await client.query(sql);
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('   All records have been deleted.');
    console.log('   Control numbers will reset to 001-001 on next record creation.');
    
  } catch (error) {
    console.error('\n❌ Error executing cleanup script:');
    console.error(error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    rl.close();
  }
}

// Run the script
runCleanupScript().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

