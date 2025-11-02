// scripts/migrate-info-sheet-soft-delete.ts
import 'dotenv/config'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'

async function run() {
  try {
    const migPath = path.join(process.cwd(), 'migrations', '20251028_add_deleted_at_information_sheet.sql')
    if (!fs.existsSync(migPath)) {
      console.error('Migration file not found:', migPath)
      process.exit(1)
    }
    const sql = fs.readFileSync(migPath, 'utf8')
    console.log('Applying soft-delete migration for information_sheet_records...')
    await db.query(sql)
    console.log('Migration applied successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

run()


