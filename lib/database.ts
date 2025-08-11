// lib/database.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { Pool, PoolClient } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'balikbayani',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
