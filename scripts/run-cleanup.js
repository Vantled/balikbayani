// scripts/run-cleanup.js
// Run the cleanup SQL script using the database connection from .env.local

const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const readline = require('readline');

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
};

// Create connection pool
const pool = new Pool(dbConfig);

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runCleanupScript() {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA from the following tables:');
    console.log('   - Direct Hire Applications');
    console.log('   - Balik Manggagawa Clearance');
    console.log('   - Gov to Gov Applications');
    console.log('   - Information Sheet Records');
    console.log('   - Job Fairs (with emails and contacts)');
    console.log('   - Related documents and actions');
    console.log('');
    console.log('📊 Connecting to database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log('');
    
    // Ask for confirmation
    const answer = await question('Are you sure you want to proceed? Type "YES" to confirm: ');
    
    if (answer.trim().toUpperCase() !== 'YES') {
      console.log('\n❌ Cleanup cancelled. No data was deleted.');
      return;
    }
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'cleanup-sample-data.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('\n🗑️  Executing cleanup script...');
    console.log('   Using DELETE for safe deletion (avoids lock issues)...');
    console.log('   This should complete quickly...\n');
    
    // Set up notice handler to show progress in real-time
    let noticeHandler = (msg) => {
      if (msg.message) {
        const message = msg.message.trim();
        if (message && !message.includes('already exists, skipping')) {
          console.log(`   ${message}`);
        }
      }
    };
    
    client.on('notice', noticeHandler);
    
    // Check for blocking locks and long-running queries before starting
    let blockingQueries = [];
    try {
      // First, get list of tables that actually exist to avoid errors
      const existingTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'direct_hire_applications',
          'balik_manggagawa_clearance',
          'gov_to_gov_applications',
          'information_sheet_records',
          'job_fairs',
          'documents',
          'actions_taken',
          'personal_info',
          'employment_info',
          'direct_hire_documents',
          'job_fair_emails',
          'job_fair_contacts'
        )
      `);
      
      if (existingTables.rows.length > 0) {
        // Build dynamic query with only existing tables
        const tableNames = existingTables.rows.map(r => `'${r.table_name}'::regclass`).join(', ');
        
        const lockCheck = await client.query(`
          SELECT DISTINCT
            a.pid,
            a.state,
            a.query_start,
            now() - a.query_start AS query_duration,
            SUBSTRING(a.query, 1, 200) AS query_preview,
            COALESCE(a.application_name, 'N/A') AS application_name,
            a.usename,
            l.relation::regclass::text AS locked_table
          FROM pg_locks l
          JOIN pg_stat_activity a ON l.pid = a.pid
          WHERE l.relation IN (${tableNames})
          AND a.pid != pg_backend_pid()
          AND a.state != 'idle'
          ORDER BY a.query_start
          LIMIT 20;
        `);
        
        blockingQueries = lockCheck.rows;
      }
      
      if (blockingQueries.length > 0) {
        console.log('⚠️  Warning: Blocking database connections detected:');
        blockingQueries.forEach((row, idx) => {
          console.log(`   ${idx + 1}. PID ${row.pid} - ${row.state} - User: ${row.usename}`);
          console.log(`      Table: ${row.locked_table || 'N/A'}`);
          console.log(`      Duration: ${row.query_duration}`);
          console.log(`      App: ${row.application_name || 'N/A'}`);
          if (row.query_preview) {
            console.log(`      Query: ${row.query_preview}...`);
          }
          console.log('');
        });
        
        // Also check for idle transactions that might be holding locks
        try {
          const idleCheck = await client.query(`
            SELECT pid, state, query_start, now() - query_start AS idle_duration, 
                   application_name, usename, LEFT(query, 100) AS query_preview
            FROM pg_stat_activity
            WHERE state = 'idle in transaction'
            AND pid != pg_backend_pid()
            AND (now() - query_start) > interval '5 seconds'
            ORDER BY query_start
            LIMIT 10;
          `);
          
          if (idleCheck.rows.length > 0) {
            console.log('\n⚠️  Also found idle transactions that may be holding locks:');
            idleCheck.rows.forEach((row, idx) => {
              console.log(`   ${idx + 1}. PID ${row.pid} - Idle for ${row.idle_duration}`);
              console.log(`      User: ${row.usename}, App: ${row.application_name || 'N/A'}`);
            });
            blockingQueries = blockingQueries.concat(idleCheck.rows);
          }
        } catch (err) {
          // Ignore
        }
        
        if (blockingQueries.length > 0) {
          console.log(`\n🔪 Automatically killing ${blockingQueries.length} blocking queries/transactions...`);
          let killedCount = 0;
          
          for (const query of blockingQueries) {
            try {
              // Try to terminate immediately (more aggressive)
              await client.query(`SELECT pg_terminate_backend($1)`, [query.pid]);
              console.log(`   ✅ Killed PID ${query.pid}`);
              killedCount++;
              await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between kills
            } catch (killErr) {
              // If terminate fails, try cancel
              try {
                await client.query(`SELECT pg_cancel_backend($1)`, [query.pid]);
                console.log(`   ⚠️  Cancelled PID ${query.pid} (terminate failed)`);
                killedCount++;
              } catch (cancelErr) {
                console.log(`   ❌ Could not kill PID ${query.pid}: ${killErr.message}`);
              }
            }
          }
          
          console.log(`\n   Killed ${killedCount} of ${blockingQueries.length} blocking queries.`);
          console.log('   Waiting 3 seconds for locks to clear...\n');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Verify locks are cleared
          try {
            const verifyCheck = await client.query(`
              SELECT COUNT(*) as remaining_locks
              FROM pg_locks
              JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
              WHERE pg_locks.relation IN (
                'direct_hire_applications'::regclass,
                'balik_manggagawa_clearance'::regclass,
                'gov_to_gov_applications'::regclass,
                'information_sheet_records'::regclass,
                'job_fairs'::regclass
              )
              AND pg_stat_activity.pid != pg_backend_pid();
            `);
            
            if (parseInt(verifyCheck.rows[0].remaining_locks) > 0) {
              console.log('   ⚠️  Warning: Some locks may still be active. Proceeding anyway...\n');
            } else {
              console.log('   ✅ All locks cleared. Safe to proceed.\n');
            }
          } catch (err) {
            // Ignore verification errors
          }
        } else {
          console.log('   ✅ No blocking queries detected.\n');
        }
      } else {
        console.log('   ✅ No blocking queries detected.\n');
      }
    } catch (err) {
      // Log the error for debugging but proceed anyway
      console.log(`   ⚠️  Could not check for locks: ${err.message}`);
      console.log('   Proceeding anyway - will attempt to kill blocking queries if timeout occurs.\n');
    }
    
    // Execute the SQL script with automatic retry on timeout
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`   Retry attempt ${retryCount} of ${maxRetries}...`);
          
          // Aggressively kill ALL blocking queries before retry
          try {
            // Get list of existing tables first
            const existingTables = await client.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name IN (
                'direct_hire_applications',
                'balik_manggagawa_clearance',
                'gov_to_gov_applications',
                'information_sheet_records',
                'job_fairs',
                'documents',
                'actions_taken',
                'personal_info',
                'employment_info',
                'direct_hire_documents'
              )
            `);
            
            let allBlocking = { rows: [] };
            
            if (existingTables.rows.length > 0) {
              // Build dynamic query with only existing tables
              const tableNames = existingTables.rows.map(r => `'${r.table_name}'::regclass`).join(', ');
              
              allBlocking = await client.query(`
                SELECT DISTINCT a.pid
                FROM pg_stat_activity a
                LEFT JOIN pg_locks l ON l.pid = a.pid
                WHERE a.pid != pg_backend_pid()
                AND (
                  l.relation IN (${tableNames})
                  OR a.state = 'idle in transaction'
                );
              `);
            } else {
              // If no tables exist, just kill idle transactions
              allBlocking = await client.query(`
                SELECT DISTINCT pid
                FROM pg_stat_activity
                WHERE pid != pg_backend_pid()
                AND state = 'idle in transaction';
              `);
            }
            
            if (allBlocking.rows.length > 0) {
              console.log(`   Killing ${allBlocking.rows.length} blocking processes...`);
              let killed = 0;
              for (const proc of allBlocking.rows) {
                try {
                  await client.query(`SELECT pg_terminate_backend($1)`, [proc.pid]);
                  killed++;
                } catch (e) {
                  // Ignore individual kill errors
                }
              }
              console.log(`   Killed ${killed} processes.`);
            }
            
            // Also try to kill any idle in transaction connections
            try {
              const idleConnections = await client.query(`
                SELECT pid FROM pg_stat_activity
                WHERE state = 'idle in transaction'
                AND pid != pg_backend_pid()
                AND (now() - query_start) > interval '1 second';
              `);
              
              for (const conn of idleConnections.rows) {
                try {
                  await client.query(`SELECT pg_terminate_backend($1)`, [conn.pid]);
                } catch (e) {
                  // Ignore
                }
              }
            } catch (e) {
              // Ignore
            }
            
            console.log('   Waiting 5 seconds for all locks to clear...\n');
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (killErr) {
            console.log(`   Could not kill all blocking processes: ${killErr.message}`);
            console.log('   Proceeding anyway...\n');
          }
        }
        
        // Execute the SQL with a reasonable timeout
        await client.query(sql);
        break; // Success, exit retry loop
        
      } catch (error) {
        if ((error.code === '57014' || error.message.includes('timeout')) && retryCount < maxRetries) {
          retryCount++;
          console.log(`\n   ⚠️  Timeout occurred (attempt ${retryCount}). Clearing locks and retrying...\n`);
          continue;
        } else {
          // Not a timeout or max retries reached
          throw error;
        }
      }
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Cleanup completed in ${duration} seconds.`);
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('   All records have been deleted.');
    console.log('   Control numbers will reset to 001-001 on next record creation.');
    
  } catch (error) {
    console.error('\n❌ Error executing cleanup script:');
    console.error(error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    rl.close();
  }
}

// Run the script
runCleanupScript().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

