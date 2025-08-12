// lib/set-superadmin-password.ts
import { db } from './database';
import bcrypt from 'bcryptjs';

async function setSuperadminPassword() {
  try {
    console.log('Setting superadmin password...');

    // Default password for superadmin
    const password = 'superadmin123';
    const saltRounds = 12;
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update the superadmin password
    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username, email, role',
      [passwordHash, 'superadmin']
    );

    if (result.rows.length > 0) {
      console.log('✅ Superadmin password updated successfully!');
      console.log('Username:', result.rows[0].username);
      console.log('Email:', result.rows[0].email);
      console.log('Role:', result.rows[0].role);
      console.log('\n📋 Login Credentials:');
      console.log('Username: superadmin');
      console.log('Password: superadmin123');
      console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!');
    } else {
      console.log('❌ Superadmin user not found');
    }

  } catch (error) {
    console.error('❌ Error setting superadmin password:', error);
  } finally {
    await db.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  setSuperadminPassword()
    .then(() => {
      console.log('\nScript completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
