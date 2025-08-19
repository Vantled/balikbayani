// scripts/migrate-bm-clearance-narrative.ts
import { db } from '../lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateNarrativeFields() {
  try {
    console.log('Starting migration for Balik Manggagawa Clearance narrative fields...');
    
    const sqlPath = join(__dirname, '../lib/migrate-bm-clearance-narrative.sql');
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

migrateNarrativeFields().catch(console.error);
