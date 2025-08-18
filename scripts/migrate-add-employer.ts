// scripts/migrate-add-employer.ts
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '../lib/database'

async function migrate() {
  try {
    console.log('Starting employer column migration...')
    const sql = readFileSync(join(__dirname, '../lib/migrate-add-employer.sql'), 'utf8')
    await db.query(sql)
    console.log('✅ employer column migration completed')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    try { await db.close() } catch {}
  }
}

migrate()
