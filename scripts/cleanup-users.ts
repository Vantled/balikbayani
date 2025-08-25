// scripts/cleanup-users.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { db } from '../lib/database';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function cleanupUsers() {
  try {
    console.log('🧹 Starting user cleanup process...\n');

    // Step 1: Check current users
    console.log('📋 Checking current users...');
    const { rows: allUsers } = await db.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at'
    );

    console.log(`Found ${allUsers.length} users in the database:`);
    allUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

    // Step 2: Identify users to keep (admin and superadmin)
    const usersToKeep = ['admin', 'superadmin'];
    const usersToDelete = allUsers.filter(user => !usersToKeep.includes(user.username));

    if (usersToDelete.length === 0) {
      console.log('\n✅ No users to delete. Only admin and superadmin users exist.');
      return true;
    }

    console.log(`\n🗑️  Users to be deleted (${usersToDelete.length}):`);
    usersToDelete.forEach(user => {
      console.log(`   - ${user.username} (${user.role})`);
    });

    console.log(`\n✅ Users to keep (${usersToKeep.length}):`);
    usersToKeep.forEach(username => {
      const user = allUsers.find(u => u.username === username);
      if (user) {
        console.log(`   - ${user.username} (${user.role})`);
      } else {
        console.log(`   - ${username} (not found)`);
      }
    });

    // Step 3: Confirm deletion
    console.log('\n⚠️  WARNING: This action will permanently delete the above users!');
    console.log('This action cannot be undone.');
    
    // For safety, we'll require manual confirmation
    console.log('\nTo proceed with deletion, please run this script with the --confirm flag:');
    console.log('tsx scripts/cleanup-users.ts --confirm');
    
    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Deletion cancelled. No users were deleted.');
      return false;
    }

    // Step 4: Delete users (with foreign key handling)
    console.log('\n🗑️  Deleting users...');
    
    for (const user of usersToDelete) {
      try {
        // First, delete related audit logs
        await db.query('DELETE FROM audit_logs WHERE user_id = $1', [user.id]);
        
        // Then delete the user
        await db.query('DELETE FROM users WHERE id = $1', [user.id]);
        console.log(`   ✅ Deleted: ${user.username} (${user.role})`);
      } catch (error) {
        console.error(`   ❌ Failed to delete ${user.username}:`, error.message);
      }
    }

    // Step 5: Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const { rows: remainingUsers } = await db.query(
      'SELECT username, role, is_active FROM users ORDER BY username'
    );

    console.log(`\n✅ Cleanup completed! ${remainingUsers.length} users remaining:`);
    remainingUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

    return true;

  } catch (error) {
    console.error('\n❌ User cleanup failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupUsers()
    .then((success) => {
      if (success) {
        console.log('\n✅ User cleanup completed successfully');
      } else {
        console.log('\n❌ User cleanup was cancelled');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ User cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupUsers };
