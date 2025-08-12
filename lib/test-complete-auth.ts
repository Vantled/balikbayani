// lib/test-complete-auth.ts
import { AuthService } from './services/auth-service';

async function testCompleteAuth() {
  try {
    console.log('🧪 Testing Complete Authentication Flow...\n');

    // 1. Test superadmin login
    console.log('1. Testing superadmin login...');
    const loginResult = await AuthService.loginUser('superadmin', 'superadmin123');
    
    if (loginResult.success && loginResult.token) {
      console.log('✅ Login successful');
      console.log(`   Token: ${loginResult.token.substring(0, 8)}...`);
      console.log(`   User: ${loginResult.user?.username} (${loginResult.user?.role})`);
      
      // 2. Test session validation with the token
      console.log('\n2. Testing session validation...');
      const validationResult = await AuthService.validateSession(loginResult.token);
      
      if (validationResult) {
        console.log('✅ Session validation successful');
        console.log(`   User: ${validationResult.username} (${validationResult.role})`);
        console.log(`   Is Superadmin: ${validationResult.role === 'superadmin'}`);
        
        // 3. Test if user can access superadmin features
        console.log('\n3. Testing superadmin permissions...');
        const isSuperadmin = validationResult.role === 'superadmin';
        console.log(`   Can access user management: ${isSuperadmin}`);
        
        if (isSuperadmin) {
          // 4. Test getting all users (superadmin only)
          console.log('\n4. Testing get all users (superadmin only)...');
          const usersResult = await AuthService.getAllUsers();
          
          if (usersResult.success && usersResult.users) {
            console.log('✅ Get users successful');
            console.log(`   Found ${usersResult.users.length} users:`);
            usersResult.users.forEach((user, index) => {
              console.log(`   ${index + 1}. ${user.username} (${user.role})`);
            });
          } else {
            console.log('❌ Get users failed:', usersResult.error);
          }
        }
      } else {
        console.log('❌ Session validation failed');
      }
    } else {
      console.log('❌ Login failed:', loginResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testCompleteAuth()
    .then(() => {
      console.log('\n✅ Complete auth test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}
