// lib/test-logout.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { logout } from './auth';

// Load environment variables from .env.local
config({ path: '.env.local' });

export async function testLogout() {
  try {
    console.log('Testing logout speed...');
    
    const startTime = Date.now();
    
    // Test logout
    await logout();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Logout completed in ${duration}ms`);
    
    if (duration < 100) {
      console.log('🚀 Excellent! Logout is very fast');
    } else if (duration < 500) {
      console.log('👍 Good! Logout is reasonably fast');
    } else {
      console.log('⚠️  Logout is taking longer than expected');
    }
    
  } catch (error) {
    console.error('❌ Logout test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testLogout()
    .then(() => {
      console.log('\nLogout test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Logout test failed:', error);
      process.exit(1);
    });
}
