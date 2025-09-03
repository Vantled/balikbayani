// scripts/add-direct-hire-doc-columns.js
const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'balikbayani',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()
  try {
    console.log('Adding columns to direct_hire_applications...')

    await client.query(`
      ALTER TABLE direct_hire_applications
      ADD COLUMN IF NOT EXISTS documents_completed BOOLEAN DEFAULT FALSE;
    `)
    await client.query(`
      ALTER TABLE direct_hire_applications
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_direct_hire_documents_completed
      ON direct_hire_applications (documents_completed);
    `)

    // Normalize any nulls to default
    await client.query(`
      UPDATE direct_hire_applications
      SET documents_completed = FALSE
      WHERE documents_completed IS NULL;
    `)

    console.log('Columns added successfully.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

run()


