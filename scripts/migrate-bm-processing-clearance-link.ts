// scripts/migrate-bm-processing-clearance-link.ts
import { db } from '../lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateProcessingClearanceLink() {
  try {
    console.log('Starting migration for Balik Manggagawa Processing-Clearance link...');
    
    const sqlPath = join(__dirname, '../lib/migrate-bm-processing-clearance-link.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

migrateProcessingClearanceLink().catch(console.error);
