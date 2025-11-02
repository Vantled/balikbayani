// scripts/add-date-received-field.ts
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'balikbayani',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addDateReceivedField() {
  const client = await pool.connect();
  
  try {
    console.log('Adding date_received_by_region field to gov_to_gov_applications...');
    
    // Add date_received_by_region field
    await client.query(`
      ALTER TABLE gov_to_gov_applications
        ADD COLUMN IF NOT EXISTS date_received_by_region DATE;
    `);
    
    console.log('✅ Successfully added date_received_by_region field to gov_to_gov_applications table');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gov_to_gov_applications' 
      AND column_name = 'date_received_by_region';
    `);
    
    if (result.rows.length > 0) {
      console.log('📋 Added column:');
      console.log(`  - ${result.rows[0].column_name}: ${result.rows[0].data_type}`);
    }
    
  } catch (error) {
    console.error('❌ Error adding date_received_by_region field:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addDateReceivedField()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
