// scripts/add-user-permissions.ts
import { db } from '@/lib/database';

export async function addUserPermissions() {
  try {
    console.log('Adding user permissions table and default permissions...');
    
    // Read and execute the migration SQL
    const fs = await import('fs');
    const path = await import('path');
    
    const migrationPath = path.join(process.cwd(), 'migrations', '20250128_add_user_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(migrationSQL);
    
    console.log('✅ User permissions table created successfully');
    console.log('✅ Default permissions granted to all existing users');
    
    // Verify the migration
    const result = await db.query('SELECT COUNT(*) as count FROM user_permissions');
    console.log(`✅ Total permissions created: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error adding user permissions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addUserPermissions()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
