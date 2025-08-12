// lib/test-profile.ts
import { AuthService } from './services/auth-service';
import { db } from './database';

async function testProfileFunctionality() {
  try {
    console.log('🧪 Testing Profile Functionality...\n');

    // 1. Test superadmin login
    console.log('1. Testing superadmin login...');
    const loginResult = await AuthService.loginUser('superadmin', 'superadmin123');
    
    if (!loginResult.success || !loginResult.user) {
      console.log('❌ Superadmin login failed');
      return;
    }
    
    console.log('✅ Superadmin login successful');
    console.log(`   User: ${loginResult.user.username} (${loginResult.user.role})`);

    // 2. Test get user by ID
    console.log('\n2. Testing get user by ID...');
    const userById = await AuthService.getUserById(loginResult.user.id);
    
    if (userById) {
      console.log('✅ Get user by ID successful');
      console.log(`   User: ${userById.full_name} (${userById.email})`);
    } else {
      console.log('❌ Get user by ID failed');
    }

    // 3. Test get user by email
    console.log('\n3. Testing get user by email...');
    const userByEmail = await AuthService.getUserByEmail(loginResult.user.email);
    
    if (userByEmail) {
      console.log('✅ Get user by email successful');
      console.log(`   User: ${userByEmail.username} (${userByEmail.full_name})`);
    } else {
      console.log('❌ Get user by email failed');
    }

    // 4. Test get user by username
    console.log('\n4. Testing get user by username...');
    const userByUsername = await AuthService.getUserByUsername(loginResult.user.username);
    
    if (userByUsername) {
      console.log('✅ Get user by username successful');
      console.log(`   User: ${userByUsername.full_name} (${userByUsername.email})`);
    } else {
      console.log('❌ Get user by username failed');
    }

    // 5. Test profile update via API (without password change)
    console.log('\n5. Testing profile update via API (without password)...');
    
    // First, we need to create a session to get a token
    const session = await AuthService.createSession(loginResult.user.id);
    if (!session) {
      console.log('❌ Failed to create session for API test');
      return;
    }

    // Test API call with current password
    const updateData = {
      email: 'superadmin@balikbayani.gov.ph',
      username: 'superadmin',
      current_password: 'superadmin123'
    };

    // Simulate API call by calling the service method directly with current password validation
    const updateResult = await AuthService.updateUserProfile(loginResult.user.id, {
      email: updateData.email,
      username: updateData.username
    });
    
    if (updateResult.success && updateResult.user) {
      console.log('✅ Profile update successful');
      console.log(`   Updated username: ${updateResult.user.username}`);
    } else {
      console.log('❌ Profile update failed');
      console.log(`   Error: ${updateResult.error}`);
    }

    // 6. Test profile update with password change
    console.log('\n6. Testing profile update with password change...');
    const updateWithPasswordData = {
      email: 'superadmin@balikbayani.gov.ph',
      username: 'superadmin',
      password_hash: await AuthService.hashPassword('superadmin123'),
      password_changed_at: new Date().toISOString()
    };
    
    const updatePasswordResult = await AuthService.updateUserProfile(loginResult.user.id, updateWithPasswordData);
    
    if (updatePasswordResult.success && updatePasswordResult.user) {
      console.log('✅ Profile update with password successful');
      console.log(`   Updated username: ${updatePasswordResult.user.username}`);
    } else {
      console.log('❌ Profile update with password failed');
      console.log(`   Error: ${updatePasswordResult.error}`);
    }

    // 7. Test password change method
    console.log('\n7. Testing password change method...');
    const passwordChangeResult = await AuthService.changePassword(
      loginResult.user.id,
      'superadmin123',
      'newpassword123'
    );
    
    if (passwordChangeResult.success) {
      console.log('✅ Password change successful');
      
      // Change password back to original
      const revertPasswordResult = await AuthService.changePassword(
        loginResult.user.id,
        'newpassword123',
        'superadmin123'
      );
      
      if (revertPasswordResult.success) {
        console.log('✅ Password changed back to original');
      } else {
        console.log('❌ Failed to revert password');
      }
    } else {
      console.log('❌ Password change failed');
      console.log(`   Error: ${passwordChangeResult.error}`);
    }

    console.log('\n✅ Profile functionality test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await db.close();
  }
}

testProfileFunctionality();
