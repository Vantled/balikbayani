// scripts/test-permissions.ts
import { DatabaseService } from '@/lib/services/database-service';

export async function testPermissions() {
  try {
    console.log('Testing permission system...');
    
    // Test getting users with permissions
    const users = await DatabaseService.getUsersWithPermissions();
    console.log(`✅ Found ${users.length} users with permissions`);
    
    // Test available permissions
    const availablePermissions = DatabaseService.getAvailablePermissions();
    console.log('✅ Available permissions:', availablePermissions);
    
    // Test permission checking for first user
    if (users.length > 0) {
      const firstUser = users[0];
      console.log(`✅ Testing permissions for user: ${firstUser.full_name}`);
      
      for (const permission of availablePermissions) {
        const hasPermission = await DatabaseService.hasPermission(firstUser.id, permission);
        console.log(`  - ${permission}: ${hasPermission ? '✅ Granted' : '❌ Denied'}`);
      }
    }
    
    console.log('✅ Permission system test completed successfully');
    
  } catch (error) {
    console.error('❌ Error testing permissions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  testPermissions()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
