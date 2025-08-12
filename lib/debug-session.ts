// lib/debug-session.ts
import { db } from './database';
import { AuthService } from './services/auth-service';

async function debugSession() {
  try {
    console.log('🔍 Debugging Session Authentication...\n');

    // 1. Check all active sessions
    console.log('1. Checking all active sessions...');
    const sessionsResult = await db.query(`
      SELECT s.session_token, s.expires_at, u.username, u.role, u.is_active, u.is_approved
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > CURRENT_TIMESTAMP
      ORDER BY s.created_at DESC
    `);

    console.log(`Found ${sessionsResult.rows.length} active sessions:`);
    sessionsResult.rows.forEach((session, index) => {
      console.log(`  ${index + 1}. Token: ${session.session_token.substring(0, 8)}...`);
      console.log(`     User: ${session.username} (${session.role})`);
      console.log(`     Active: ${session.is_active}, Approved: ${session.is_approved}`);
      console.log(`     Expires: ${session.expires_at}`);
      console.log('');
    });

    // 2. Test superadmin login
    console.log('2. Testing superadmin login...');
    const loginResult = await AuthService.loginUser('superadmin', 'superadmin123');
    
    if (loginResult.success) {
      console.log('✅ Superadmin login successful');
      console.log(`   User: ${loginResult.user?.username} (${loginResult.user?.role})`);
      console.log(`   Token: ${loginResult.token?.substring(0, 8)}...`);
      
      // 3. Test session validation
      console.log('\n3. Testing session validation...');
      const validationResult = await AuthService.validateSession(loginResult.token!);
      
      if (validationResult) {
        console.log('✅ Session validation successful');
        console.log(`   User: ${validationResult.username} (${validationResult.role})`);
        console.log(`   Is Superadmin: ${validationResult.role === 'superadmin'}`);
      } else {
        console.log('❌ Session validation failed');
      }
    } else {
      console.log('❌ Superadmin login failed:', loginResult.error);
    }

    // 4. Check user roles
    console.log('\n4. Checking user roles...');
    const usersResult = await db.query(`
      SELECT username, role, is_active, is_approved
      FROM users
      ORDER BY role, username
    `);

    console.log('Users in database:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username}: ${user.role} (Active: ${user.is_active}, Approved: ${user.is_approved})`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await db.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  debugSession()
    .then(() => {
      console.log('\nDebug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}
