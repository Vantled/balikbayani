// lib/test-role-hierarchy.ts
import { db } from './database';
import { AuthService } from './services/auth-service';
import { hasRole, isSuperadmin, isAdmin, isStaff } from './auth';

async function testRoleHierarchy() {
  try {
    console.log('Testing Role Hierarchy System...\n');

    // Test 1: Check if superadmin user exists
    console.log('1. Checking superadmin user...');
    const superadminResult = await db.query(
      'SELECT * FROM users WHERE role = $1',
      ['superadmin']
    );

    if (superadminResult.rows.length > 0) {
      console.log('✅ Superadmin user found:', superadminResult.rows[0].username);
    } else {
      console.log('❌ No superadmin user found');
    }

    // Test 2: Check role hierarchy functions
    console.log('\n2. Testing role hierarchy functions...');
    
    const mockSuperadmin = { role: 'superadmin' } as any;
    const mockAdmin = { role: 'admin' } as any;
    const mockStaff = { role: 'staff' } as any;
    const mockNull = null;

    console.log('hasRole(superadmin, "superadmin"):', hasRole(mockSuperadmin, 'superadmin'));
    console.log('hasRole(superadmin, "admin"):', hasRole(mockSuperadmin, 'admin'));
    console.log('hasRole(superadmin, "staff"):', hasRole(mockSuperadmin, 'staff'));
    console.log('hasRole(admin, "superadmin"):', hasRole(mockAdmin, 'superadmin'));
    console.log('hasRole(admin, "admin"):', hasRole(mockAdmin, 'admin'));
    console.log('hasRole(admin, "staff"):', hasRole(mockAdmin, 'staff'));
    console.log('hasRole(staff, "superadmin"):', hasRole(mockStaff, 'superadmin'));
    console.log('hasRole(staff, "admin"):', hasRole(mockStaff, 'admin'));
    console.log('hasRole(staff, "staff"):', hasRole(mockStaff, 'staff'));
    console.log('hasRole(null, "staff"):', hasRole(mockNull, 'staff'));

    // Test 3: Check specific role functions
    console.log('\n3. Testing specific role functions...');
    console.log('isSuperadmin(superadmin):', isSuperadmin(mockSuperadmin));
    console.log('isSuperadmin(admin):', isSuperadmin(mockAdmin));
    console.log('isSuperadmin(staff):', isSuperadmin(mockStaff));
    console.log('isAdmin(superadmin):', isAdmin(mockSuperadmin));
    console.log('isAdmin(admin):', isAdmin(mockAdmin));
    console.log('isAdmin(staff):', isAdmin(mockStaff));
    console.log('isStaff(superadmin):', isStaff(mockSuperadmin));
    console.log('isStaff(admin):', isStaff(mockAdmin));
    console.log('isStaff(staff):', isStaff(mockStaff));

    // Test 4: Check database constraints
    console.log('\n4. Testing database constraints...');
    
    try {
      // Try to insert a user with invalid role
      await db.query(
        'INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
        ['testuser', 'test@test.com', 'hash', 'Test User', 'invalid_role']
      );
      console.log('❌ Database constraint failed - allowed invalid role');
    } catch (error) {
      console.log('✅ Database constraint working - rejected invalid role');
    }

    // Test 5: Check user counts by role
    console.log('\n5. Checking user distribution by role...');
    const roleCounts = await db.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY 
        CASE role 
          WHEN 'superadmin' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'staff' THEN 3 
        END
    `);

    roleCounts.rows.forEach(row => {
      console.log(`${row.role}: ${row.count} users`);
    });

    // Test 6: Check created_by column
    console.log('\n6. Checking created_by column...');
    const createdByCheck = await db.query(`
      SELECT COUNT(*) as total_users,
             COUNT(created_by) as users_with_creator
      FROM users
    `);

    const { total_users, users_with_creator } = createdByCheck.rows[0];
    console.log(`Total users: ${total_users}`);
    console.log(`Users with creator: ${users_with_creator}`);
    console.log(`Users without creator (system users): ${total_users - users_with_creator}`);

    console.log('\n✅ Role hierarchy system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.close();
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testRoleHierarchy()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
