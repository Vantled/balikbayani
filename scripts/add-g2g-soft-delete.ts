// scripts/add-g2g-soft-delete.ts
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

async function addSoftDeleteField() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Adding deleted_at field to gov_to_gov_applications...');

    const columnName = 'deleted_at';
    const columnType = 'TIMESTAMP';

    const checkColumnQuery = `SELECT column_name FROM information_schema.columns WHERE table_name='gov_to_gov_applications' AND column_name='${columnName}'`;
    const { rowCount } = await client.query(checkColumnQuery);

    if (rowCount === 0) {
      await client.query(`ALTER TABLE gov_to_gov_applications ADD COLUMN ${columnName} ${columnType}`);
      console.log(`📋 Added column:\n  - ${columnName}: ${columnType}`);
    } else {
      console.log(`  - Column ${columnName} already exists. Skipping.`);
    }

    await client.query('COMMIT');
    console.log('✅ Successfully added deleted_at field to gov_to_gov_applications table');
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSoftDeleteField().catch(console.error);
