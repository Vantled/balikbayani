// Add job_type column to balik_manggagawa_clearance table
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addJobTypeColumn() {
  try {
    console.log('Adding job_type column to balik_manggagawa_clearance...');
    
    // Add the column
    await pool.query(`
      ALTER TABLE balik_manggagawa_clearance
      ADD COLUMN IF NOT EXISTS job_type VARCHAR(20)
    `);
    
    // Add constraint
    await pool.query(`
      ALTER TABLE balik_manggagawa_clearance
      ADD CONSTRAINT IF NOT EXISTS balik_manggagawa_clearance_job_type_check
      CHECK (job_type IN ('professional', 'household') OR job_type IS NULL)
    `);
    
    console.log('✅ job_type column added successfully');
  } catch (error) {
    console.error('❌ Error adding job_type column:', error);
  } finally {
    await pool.end();
  }
}

addJobTypeColumn();
