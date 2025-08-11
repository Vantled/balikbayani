// lib/unlock-admin.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { db } from './database';

// Load environment variables from .env.local
config({ path: '.env.local' });

export async function unlockAdmin() {
  try {
    console.log('Unlocking admin account...');

    // Reset failed login attempts and remove lockout
    await db.query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           account_locked_until = NULL 
       WHERE username = $1`,
      ['admin']
    );

    // Verify the unlock
    const adminResult = await db.query(
      'SELECT username, failed_login_attempts, account_locked_until FROM users WHERE username = $1',
      ['admin']
    );

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log('✅ Admin account unlocked:');
      console.log('- Username:', admin.username);
      console.log('- Failed Attempts:', admin.failed_login_attempts);
      console.log('- Locked Until:', admin.account_locked_until);
    }

    console.log('\nAdmin account is now unlocked and ready for login');
    return true;

  } catch (error) {
    console.error('Failed to unlock admin:', error);
    throw error;
  }
}

// Run unlock if this file is executed directly
if (require.main === module) {
  unlockAdmin()
    .then(() => {
      console.log('Admin unlock completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin unlock failed:', error);
      process.exit(1);
    });
}
