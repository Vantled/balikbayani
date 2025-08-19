// scripts/migrate-bm-processing-documents.ts
import { readFileSync } from 'fs'
import { join } from 'path'
import db from '../lib/database'

async function migrateProcessingDocuments() {
  try {
    console.log('Starting migration: Add document tracking to balik_manggagawa_processing...')
    
    const migrationPath = join(__dirname, '../lib/migrate-bm-processing-documents.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    await db.query(migrationSQL)
    
    console.log('✅ Migration completed successfully: Document tracking fields added to balik_manggagawa_processing')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await db.close()
  }
}

migrateProcessingDocuments()
