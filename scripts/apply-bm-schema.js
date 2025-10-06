// scripts/apply-bm-schema.js
// Apply BM schema changes: make clearance_type nullable and add raw_salary/salary_currency

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'balikbayani',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    console.log('🔧 Applying BM schema changes...');
    await client.query('BEGIN');

    // Make clearance_type nullable and relax check constraint
    await client.query("ALTER TABLE balik_manggagawa_clearance DROP CONSTRAINT IF EXISTS balik_manggagawa_clearance_clearance_type_check;");
    await client.query("ALTER TABLE balik_manggagawa_clearance DROP CONSTRAINT IF EXISTS balik_mangganggagawa_clearance_type_check;");
    await client.query("ALTER TABLE balik_manggagawa_clearance ALTER COLUMN clearance_type DROP NOT NULL;");
    await client.query(
      "ALTER TABLE balik_manggagawa_clearance ADD CONSTRAINT balik_manggagawa_clearance_type_check CHECK (clearance_type IS NULL OR clearance_type IN ('watchlisted_employer','seafarer_position','non_compliant_country','no_verified_contract','for_assessment_country','critical_skill','watchlisted_similar_name'));")
    ;

    // Add raw salary and currency
    await client.query("ALTER TABLE balik_manggagawa_clearance ADD COLUMN IF NOT EXISTS raw_salary DECIMAL(12,2);");
    await client.query("ALTER TABLE balik_manggagawa_clearance ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10);");
    await client.query("UPDATE balik_manggagawa_clearance SET raw_salary = salary WHERE raw_salary IS NULL;");

    await client.query('COMMIT');
    console.log('✅ BM schema changes applied');
    process.exit(0);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to apply BM schema changes:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();


