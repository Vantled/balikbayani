// lib/database.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { Pool, PoolClient } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Determine SSL configuration
// Defaults to disabled unless explicitly enabled via DB_SSL=true
// Some managed databases (like Render free plan) may not support SSL
const getSslConfig = () => {
  // Explicit override via environment variable (highest priority)
  if (process.env.DB_SSL !== undefined) {
    if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
      return { rejectUnauthorized: false };
    }
    // DB_SSL=false or DB_SSL=0 explicitly disables SSL
    return false;
  }
  
  // Disable SSL for localhost connections (common in development)
  const host = process.env.DB_HOST || 'localhost';
  if (host === 'localhost' || host === '127.0.0.1') {
    return false;
  }
  
  // Default to SSL disabled unless explicitly enabled
  // Enable SSL only if DB_SSL_REQUIRED is set to true
  // This allows more control and avoids issues with databases that don't support SSL
  if (process.env.DB_SSL_REQUIRED === 'true' || process.env.DB_SSL_REQUIRED === '1') {
    return { rejectUnauthorized: false };
  }
  
  // Default: SSL disabled (safer for most deployment scenarios)
  return false;
};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'balikbayani',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: getSslConfig(),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database utility functions
export const db = {
  // Get a client from the pool
  getClient: (): Promise<PoolClient> => pool.connect(),
  
  // Execute a query
  query: (text: string, params?: any[]) => pool.query(text, params),
  
  // Execute a transaction
  transaction: async (callback: (client: PoolClient) => Promise<any>) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Close the pool
  close: () => pool.end(),
};

export default db;
