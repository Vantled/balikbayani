// scripts/run-time-received-released-migration.ts
import { db } from '../lib/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🚀 Running migration: Add time_received and time_released columns...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '20250108_add_time_received_released.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    console.log('---');
    
    // Execute the migration
    await db.query(sql);
    
    console.log('✅ Migration applied successfully!');
    console.log('\nAdded columns:');
    console.log('  - direct_hire_applications: time_received, time_released');
    console.log('  - balik_manggagawa_clearance: time_received, time_released');
    console.log('  - gov_to_gov_applications: time_received, time_released');
    console.log('  - information_sheet_records: already has these fields');
    
    // Close the database connection
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    await db.close();
    process.exit(1);
  }
}

runMigration();

