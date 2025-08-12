// scripts/migrate-roles.js
const { migrateRoleHierarchy } = require('../lib/migrate-role-hierarchy.ts');

async function runMigration() {
  try {
    console.log('Starting role hierarchy migration...');
    await migrateRoleHierarchy();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
