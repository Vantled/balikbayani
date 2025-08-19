// scripts/migrate-bm-clearance-missing-fields.ts
import { readFileSync } from 'fs'
import { join } from 'path'
import db from '../lib/database'

async function migrateMissingFields() {
  try {
    console.log('Starting migration: Add missing fields to balik_manggagawa_clearance...')
    const migrationPath = join(__dirname, '../lib/migrate-bm-clearance-missing-fields.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    await db.query(migrationSQL)
    console.log('✅ Migration completed successfully: Missing fields added to balik_manggagawa_clearance')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await db.close()
  }
}

migrateMissingFields()
