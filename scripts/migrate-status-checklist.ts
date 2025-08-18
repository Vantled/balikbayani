// scripts/migrate-status-checklist.ts
import { db } from '../lib/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting status checklist migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'lib', 'migrate-status-checklist.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ Status checklist migration completed successfully!');
    console.log('Added status_checklist column to direct_hire_applications table');
    console.log('Updated status enum to include new statuses');
    console.log('Set default evaluated status for existing applications');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigration();
