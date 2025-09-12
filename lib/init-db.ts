// lib/init-db.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { db } from './database';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables from .env.local
config({ path: '.env.local' });

export async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the entire schema as one statement
    console.log('Executing database schema...');
    await db.query(schema);
    console.log('Database schema created successfully');

    // Apply additive migrations that may not be present in old DBs (idempotent)
    const migratePath = path.join(process.cwd(), 'migrations', 'migrate-direct-hire-documents.sql')
    if (fs.existsSync(migratePath)) {
      console.log('Applying migrate-direct-hire-documents.sql...')
      const mig = fs.readFileSync(migratePath, 'utf8')
      await db.query(mig)
    }
    const addSalaryCurrencyPath = path.join(process.cwd(), 'migrations', 'add_salary_currency_to_direct_hire.sql')
    if (fs.existsSync(addSalaryCurrencyPath)) {
      console.log('Applying add_salary_currency_to_direct_hire.sql...')
      const mig2 = fs.readFileSync(addSalaryCurrencyPath, 'utf8')
      await db.query(mig2)
    }

    // Create default admin user if it doesn't exist
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Check if admin user exists
    const { rows: existingAdmin } = await db.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.length === 0) {
      await db.query(
        `UPDATE users SET 
          password_hash = $1,
          email = $2,
          full_name = $3,
          role = $4,
          is_approved = $5
        WHERE username = 'admin'`,
        [passwordHash, 'admin@balikbayani.gov.ph', 'Administrator', 'admin', true]
      );
      console.log('Default admin user created/updated');
      console.log('Username: admin');
      console.log('Password:', adminPassword);
    }

    console.log('Database initialization completed successfully');
    return true;

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}
