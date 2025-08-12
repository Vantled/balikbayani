// lib/check-admin.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { db } from './database';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
config({ path: '.env.local' });

export async function checkAndFixAdmin() {
  try {
    console.log('Checking admin user...');

    // Check if admin user exists
    const adminResult = await db.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (adminResult.rows.length === 0) {
      console.log('Admin user not found. Creating...');
      
      // Create admin user with proper password hash
      const adminPassword = 'admin123';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

      await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin', 'admin@balikbayani.gov.ph', passwordHash, 'Administrator', 'admin', true, true]
      );

      console.log('Admin user created successfully');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      const admin = adminResult.rows[0];
      console.log('Admin user found:');
      console.log('- Username:', admin.username);
      console.log('- Email:', admin.email);
      console.log('- Role:', admin.role);
      console.log('- Is Approved:', admin.is_approved);
      console.log('- Is Active:', admin.is_active);
      
      // Check if password needs to be updated
      const testPassword = 'admin123';
      const isValidPassword = await bcrypt.compare(testPassword, admin.password_hash);
      
      if (!isValidPassword) {
        console.log('Updating admin password...');
        const newPasswordHash = await bcrypt.hash(testPassword, 12);
        
        await db.query(
          'UPDATE users SET password_hash = $1 WHERE username = $2',
          [newPasswordHash, 'admin']
        );
        
        console.log('Admin password updated to: admin123');
      } else {
        console.log('Admin password is correct');
      }
    }

    // Test login
    console.log('\nTesting admin login...');
    const testResult = await db.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    if (testResult.rows.length > 0) {
      const admin = testResult.rows[0];
      const testPassword = 'admin123';
      const isValidPassword = await bcrypt.compare(testPassword, admin.password_hash);
      
      if (isValidPassword) {
        console.log('✅ Admin login test successful');
      } else {
        console.log('❌ Admin login test failed - password mismatch');
      }
    }

    console.log('\nDatabase check completed');
    return true;

  } catch (error) {
    console.error('Database check failed:', error);
    throw error;
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  checkAndFixAdmin()
    .then(() => {
      console.log('Admin check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin check failed:', error);
      process.exit(1);
    });
}
