// lib/test-user-management.ts
import { AuthService } from './services/auth-service';

async function testUserManagement() {
  try {
    console.log('🧪 Testing User Management Features...\n');

    // 1. Test superadmin login
    console.log('1. Testing superadmin login...');
    const loginResult = await AuthService.loginUser('superadmin', 'superadmin123');
    
    if (!loginResult.success || !loginResult.token) {
      console.log('❌ Superadmin login failed:', loginResult.error);
      return;
    }

    console.log('✅ Superadmin login successful');
    console.log(`   User: ${loginResult.user?.username} (${loginResult.user?.role})`);

    // 2. Test creating a new user
    console.log('\n2. Testing create new user...');
    const createResult = await AuthService.createUser({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'testpass123',
      full_name: 'Test User Account',
      role: 'staff',
      createdBy: loginResult.user!.id
    });

    if (createResult.success) {
      console.log('✅ User created successfully');
      console.log(`   Username: ${createResult.user?.username}`);
      console.log(`   Role: ${createResult.user?.role}`);
    } else {
      console.log('❌ User creation failed:', createResult.error);
    }

    // 3. Test getting all users
    console.log('\n3. Testing get all users...');
    const usersResult = await AuthService.getAllUsers();
    
    if (usersResult.success && usersResult.users) {
      console.log('✅ Get users successful');
      console.log(`   Found ${usersResult.users.length} users:`);
      usersResult.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (${user.role}) - Active: ${user.is_active}`);
      });

      // Find the test user
      const testUser = usersResult.users.find(u => u.username === 'testuser');
      
      if (testUser) {
        // 4. Test deactivating user
        console.log('\n4. Testing deactivate user...');
        const deactivateResult = await AuthService.deactivateUser(testUser.id, loginResult.user!.id);
        
        if (deactivateResult.success) {
          console.log('✅ User deactivated successfully');
        } else {
          console.log('❌ User deactivation failed:', deactivateResult.error);
        }

        // 5. Test activating user
        console.log('\n5. Testing activate user...');
        const activateResult = await AuthService.activateUser(testUser.id, loginResult.user!.id);
        
        if (activateResult.success) {
          console.log('✅ User activated successfully');
        } else {
          console.log('❌ User activation failed:', activateResult.error);
        }

        // 6. Test updating user role
        console.log('\n6. Testing update user role...');
        const updateResult = await AuthService.updateUserRole(testUser.id, 'admin', loginResult.user!.id);
        
        if (updateResult.success) {
          console.log('✅ User role updated successfully');
        } else {
          console.log('❌ User role update failed:', updateResult.error);
        }
      }
    } else {
      console.log('❌ Get users failed:', usersResult.error);
    }

    // 7. Test name anonymization function
    console.log('\n7. Testing name anonymization...');
    const testNames = [
      'John Doe',
      'Maria Santos Cruz',
      'Juan',
      'Ana',
      'Dr. Jose Rizal',
      'Atty. Maria Clara'
    ];

    testNames.forEach(name => {
      const anonymized = name.split(' ').map(word => {
        if (word.length <= 3) return word;
        return word.substring(0, 3) + '*'.repeat(word.length - 3);
      }).join(' ');
      console.log(`   "${name}" -> "${anonymized}"`);
    });

    // 8. Test email anonymization function
    console.log('\n8. Testing email anonymization...');
    const testEmails = [
      'john.doe@example.com',
      'maria@test.org',
      'admin@balikbayani.gov.ph',
      'user123@company.co.uk'
    ];

    testEmails.forEach(email => {
      const anonymized = email.length <= 3 ? email : email.substring(0, 3) + '*'.repeat(email.length - 3);
      console.log(`   "${email}" -> "${anonymized}"`);
    });

    // 9. Test username anonymization function
    console.log('\n9. Testing username anonymization...');
    const testUsernames = [
      'john_doe',
      'maria',
      'admin_user',
      'user123',
      'superadmin'
    ];

    testUsernames.forEach(username => {
      const anonymized = username.length <= 3 ? username : username.substring(0, 3) + '*'.repeat(username.length - 3);
      console.log(`   "${username}" -> "${anonymized}"`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testUserManagement()
    .then(() => {
      console.log('\n✅ User management test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}
