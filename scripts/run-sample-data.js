// scripts/run-sample-data.js
// Run the sample data generation SQL script using the database connection from .env.local

const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

async function runSampleDataScript() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Connecting to database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'generate-sample-data.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('\n🚀 Executing sample data generation script...');
    console.log('   This may take a few minutes...\n');
    
    // Execute the SQL script
    await client.query(sql);
    
    console.log('\n✅ Sample data generation completed successfully!');
    console.log('   Generated 1000 records for each table:');
    console.log('   - Direct Hire Applications');
    console.log('   - Balik Manggagawa Clearance');
    console.log('   - Gov to Gov Applications');
    console.log('   - Information Sheet Records');
    console.log('   - Job Fairs (with emails and contacts)');
    
  } catch (error) {
    console.error('\n❌ Error executing sample data script:');
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
  }
}

// Run the script
runSampleDataScript().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

