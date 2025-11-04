// scripts/run-system-reports-migration.ts
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'

// Load environment variables
config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'balikbayani',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function runMigration() {
  const client = await pool.connect()
  try {
    console.log('Running migration: create_system_reports_certificates_table.sql')
    
    const migrationPath = join(process.cwd(), 'migrations', 'create_system_reports_certificates_table.sql')
    const sql = readFileSync(migrationPath, 'utf8')
    
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

