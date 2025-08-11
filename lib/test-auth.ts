// lib/test-auth.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { AuthService } from './services/auth-service';

// Load environment variables from .env.local
config({ path: '.env.local' });

export async function testAuth() {
  try {
    console.log('Testing authentication...');

    // Test 1: Direct database query
    console.log('\n1. Testing direct database query...');
    const { db } = await import('./database');
    const userResult = await db.query(
      'SELECT username, is_approved, is_active FROM users WHERE username = $1',
      ['admin']
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ User found in database:');
      console.log('- Username:', user.username);
      console.log('- Is Approved:', user.is_approved);
      console.log('- Is Active:', user.is_active);
    } else {
      console.log('❌ User not found in database');
      return;
    }

    // Test 2: AuthService login
    console.log('\n2. Testing AuthService login...');
    const loginResult = await AuthService.loginUser('admin', 'admin123', '127.0.0.1', 'test-agent');
    
    if (loginResult.success) {
      console.log('✅ AuthService login successful');
      console.log('- User ID:', loginResult.user?.id);
      console.log('- Token:', loginResult.token?.substring(0, 20) + '...');
    } else {
      console.log('❌ AuthService login failed:', loginResult.error);
    }

    // Test 3: Test API endpoint
    console.log('\n3. Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });

    const data = await response.json();
    console.log('API Response Status:', response.status);
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('✅ API login successful');
    } else {
      console.log('❌ API login failed:', data.error);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAuth()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
