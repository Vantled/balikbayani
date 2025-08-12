// lib/cleanup-test-user.ts
import { db } from './database';

async function cleanupTestUser() {
  try {
    console.log('🧹 Cleaning up test user...\n');

    // Delete test user
    const result = await db.query('DELETE FROM users WHERE username = $1', ['testuser']);
    
    if (result.rowCount > 0) {
      console.log('✅ Test user "testuser" removed successfully');
    } else {
      console.log('ℹ️  Test user "testuser" not found (already cleaned up)');
    }

    // Show remaining users
    const usersResult = await db.query('SELECT username, role FROM users ORDER BY username');
    console.log('\n📋 Remaining users:');
    usersResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await db.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  cleanupTestUser()
    .then(() => {
      console.log('\n✅ Cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}
