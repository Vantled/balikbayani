import { db } from '../lib/database'
import fs from 'fs'
import path from 'path'

async function runMigration() {
  try {
    console.log('Starting BM Clearance extended migration...')
    const migrationPath = path.join(process.cwd(), 'lib', 'migrate-bm-clearance-extended.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    await db.query(sql)
    console.log('✅ BM Clearance extended migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await db.close()
  }
}

runMigration()


