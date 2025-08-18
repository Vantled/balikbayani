// scripts/migrate-soft-delete.ts
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '../lib/database'

async function migrate() {
  try {
    console.log('Starting soft-delete migration...')
    const sql = readFileSync(join(__dirname, '../lib/migrate-soft-delete.sql'), 'utf8')
    await db.query(sql)
    console.log('✅ soft-delete migration completed')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    try { await db.close() } catch {}
  }
}

migrate()
