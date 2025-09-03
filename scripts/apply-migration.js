// scripts/apply-migration.js
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'balikbayani',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    console.log('Database config:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'balikbayani',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD ? '***' : 'empty'
    });
    
    const client = await pool.connect();
    console.log('Connected to database successfully!');
    
    console.log('Applying migration: Add is_rescheduled field and remove contact_number from job_fairs table...');
    
    // Add is_rescheduled column to job_fairs table
    const result1 = await client.query(`
      ALTER TABLE job_fairs ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT FALSE;
    `);
    console.log('is_rescheduled column addition result:', result1);
    
    // Update existing records to have is_rescheduled = false
    const result2 = await client.query(`
      UPDATE job_fairs SET is_rescheduled = FALSE WHERE is_rescheduled IS NULL;
    `);
    console.log('is_rescheduled update result:', result2);
    
    // Remove contact_number column from job_fairs table (if it exists)
    const result3 = await client.query(`
      ALTER TABLE job_fairs DROP COLUMN IF EXISTS contact_number;
    `);
    console.log('contact_number column removal result:', result3);
    
    // Remove email_for_invitation column from job_fairs table (if it exists)
    const result4 = await client.query(`
      ALTER TABLE job_fairs DROP COLUMN IF EXISTS email_for_invitation;
    `);
    console.log('email_for_invitation column removal result:', result4);
    
    // Create job_fair_contacts table if it doesn't exist
    const result5 = await client.query(`
      CREATE TABLE IF NOT EXISTS job_fair_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_fair_id UUID NOT NULL REFERENCES job_fairs(id) ON DELETE CASCADE,
        contact_category VARCHAR(50) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('job_fair_contacts table creation result:', result5);
    
    // Create job_fair_emails table if it doesn't exist
    const result6 = await client.query(`
      CREATE TABLE IF NOT EXISTS job_fair_emails (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_fair_id UUID NOT NULL REFERENCES job_fairs(id) ON DELETE CASCADE,
        email_address VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('job_fair_emails table creation result:', result6);
    
    console.log('Applying migration: Add table last modified tracking...');
    
    // Create table_last_modified table
    const result7 = await client.query(`
      CREATE TABLE IF NOT EXISTS table_last_modified (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_name VARCHAR(100) NOT NULL UNIQUE,
        last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('table_last_modified table creation result:', result7);
    
    // Insert initial records for existing tables
    const result8 = await client.query(`
      INSERT INTO table_last_modified (table_name, last_modified_at) VALUES
        ('job_fairs', CURRENT_TIMESTAMP),
        ('job_fair_monitoring', CURRENT_TIMESTAMP),
        ('peso_contacts', CURRENT_TIMESTAMP),
        ('pra_contacts', CURRENT_TIMESTAMP)
      ON CONFLICT (table_name) DO NOTHING;
    `);
    console.log('table_last_modified initial records result:', result8);
    
    // Create function to update last modified timestamp
    const result9 = await client.query(`
      CREATE OR REPLACE FUNCTION update_table_last_modified()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO table_last_modified (table_name, last_modified_at)
        VALUES (TG_TABLE_NAME, CURRENT_TIMESTAMP)
        ON CONFLICT (table_name) 
        DO UPDATE SET last_modified_at = CURRENT_TIMESTAMP;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('update_table_last_modified function creation result:', result9);
    
    // Create triggers for each table
    const result10 = await client.query(`
      DROP TRIGGER IF EXISTS trigger_job_fairs_last_modified ON job_fairs;
      CREATE TRIGGER trigger_job_fairs_last_modified
        AFTER INSERT OR UPDATE OR DELETE ON job_fairs
        FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();
    `);
    console.log('job_fairs trigger creation result:', result10);
    
    const result11 = await client.query(`
      DROP TRIGGER IF EXISTS trigger_job_fair_monitoring_last_modified ON job_fair_monitoring;
      CREATE TRIGGER trigger_job_fair_monitoring_last_modified
        AFTER INSERT OR UPDATE OR DELETE ON job_fair_monitoring
        FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();
    `);
    console.log('job_fair_monitoring trigger creation result:', result11);
    
    const result12 = await client.query(`
      DROP TRIGGER IF EXISTS trigger_peso_contacts_last_modified ON peso_contacts;
      CREATE TRIGGER trigger_peso_contacts_last_modified
        AFTER INSERT OR UPDATE OR DELETE ON peso_contacts
        FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();
    `);
    console.log('peso_contacts trigger creation result:', result12);
    
    const result13 = await client.query(`
      DROP TRIGGER IF EXISTS trigger_pra_contacts_last_modified ON pra_contacts;
      CREATE TRIGGER trigger_pra_contacts_last_modified
        AFTER INSERT OR UPDATE OR DELETE ON pra_contacts
        FOR EACH ROW EXECUTE FUNCTION update_table_last_modified();
    `);
    console.log('pra_contacts trigger creation result:', result13);
    
    console.log('Applying migration: Add document meta column...');
    const resultMeta = await client.query(`
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS meta JSONB;
    `);
    console.log('documents.meta addition result:', resultMeta.rowCount ?? resultMeta);

    console.log('Migration applied successfully!');
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error applying migration:', error);
    await pool.end();
  }
}

applyMigration();
