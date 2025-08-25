// scripts/apply-salary-currency-migration.js
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'balikbayani',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function applySalaryCurrencyMigration() {
  try {
    console.log('Connecting to database...');
    console.log('Database config:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'balikbayani',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD ? '***' : 'empty'
    });
    
    const client = await pool.connect();
    console.log('Connected to database successfully!');
    
    console.log('Applying migration: Add salary_currency and raw_salary fields to direct_hire_applications table...');
    
    // Add salary_currency field to direct_hire_applications table
    const result1 = await client.query(`
      ALTER TABLE direct_hire_applications 
      ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'USD';
    `);
    console.log('salary_currency column addition result:', result1);
    
    // Add raw_salary field to store the original salary before conversion
    const result2 = await client.query(`
      ALTER TABLE direct_hire_applications 
      ADD COLUMN IF NOT EXISTS raw_salary DECIMAL(12,2);
    `);
    console.log('raw_salary column addition result:', result2);
    
    // Update existing records to have USD as default currency
    const result3 = await client.query(`
      UPDATE direct_hire_applications 
      SET salary_currency = 'USD' 
      WHERE salary_currency IS NULL;
    `);
    console.log('salary_currency update result:', result3);
    
    // Set raw_salary to current salary for existing records
    const result4 = await client.query(`
      UPDATE direct_hire_applications 
      SET raw_salary = salary 
      WHERE raw_salary IS NULL;
    `);
    console.log('raw_salary update result:', result4);
    
    console.log('Salary currency migration applied successfully!');
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error applying salary currency migration:', error);
    await pool.end();
  }
}

applySalaryCurrencyMigration();
