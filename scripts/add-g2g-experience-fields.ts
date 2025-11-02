// scripts/add-g2g-experience-fields.ts
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

async function addExperienceFields() {
  const client = await pool.connect();
  
  try {
    console.log('Adding experience detail fields to gov_to_gov_applications...');
    
    // Add Taiwan Work Experience details
    await client.query(`
      ALTER TABLE gov_to_gov_applications
        ADD COLUMN IF NOT EXISTS taiwan_company TEXT,
        ADD COLUMN IF NOT EXISTS taiwan_year_started INTEGER,
        ADD COLUMN IF NOT EXISTS taiwan_year_ended INTEGER;
    `);
    
    // Add Other Job Experience details
    await client.query(`
      ALTER TABLE gov_to_gov_applications
        ADD COLUMN IF NOT EXISTS other_company TEXT,
        ADD COLUMN IF NOT EXISTS other_year_started INTEGER,
        ADD COLUMN IF NOT EXISTS other_year_ended INTEGER;
    `);
    
    console.log('✅ Successfully added experience detail fields to gov_to_gov_applications table');
    
    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gov_to_gov_applications' 
      AND column_name IN ('taiwan_company', 'taiwan_year_started', 'taiwan_year_ended', 'other_company', 'other_year_started', 'other_year_ended')
      ORDER BY column_name;
    `);
    
    console.log('📋 Added columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding experience fields:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addExperienceFields()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
