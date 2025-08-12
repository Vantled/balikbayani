// lib/update-admin-names.ts
import { db } from './database';

async function updateAdminNames() {
  try {
    console.log('Updating admin names to remove "System" prefix...');

    // Update superadmin name
    const superadminResult = await db.query(
      'UPDATE users SET full_name = $1 WHERE username = $2 AND full_name LIKE $3 RETURNING username, full_name',
      ['Super Administrator', 'superadmin', 'System Super Administrator']
    );

    if (superadminResult.rows.length > 0) {
      console.log('✅ Superadmin name updated:');
      console.log('  Username:', superadminResult.rows[0].username);
      console.log('  New Name:', superadminResult.rows[0].full_name);
    } else {
      console.log('ℹ️  Superadmin name already updated or not found');
    }

    // Update admin name
    const adminResult = await db.query(
      'UPDATE users SET full_name = $1 WHERE username = $2 AND full_name LIKE $3 RETURNING username, full_name',
      ['Administrator', 'admin', 'System Administrator']
    );

    if (adminResult.rows.length > 0) {
      console.log('✅ Admin name updated:');
      console.log('  Username:', adminResult.rows[0].username);
      console.log('  New Name:', adminResult.rows[0].full_name);
    } else {
      console.log('ℹ️  Admin name already updated or not found');
    }

    // Show current state of admin users
    console.log('\n📋 Current admin users:');
    const allAdmins = await db.query(
      'SELECT username, full_name, role FROM users WHERE role IN ($1, $2) ORDER BY role',
      ['superadmin', 'admin']
    );

    allAdmins.rows.forEach(user => {
      console.log(`  ${user.role.toUpperCase()}: ${user.full_name} (${user.username})`);
    });

    console.log('\n✅ Admin names update completed!');

  } catch (error) {
    console.error('❌ Error updating admin names:', error);
  } finally {
    await db.close();
  }
}

// Run the update
updateAdminNames();
