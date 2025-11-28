// scripts/run-pending-migrations.ts
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { db } from '../lib/database'

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      file_name TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function hasRun(fileName: string) {
  const { rows } = await db.query(
    'SELECT 1 FROM schema_migrations WHERE file_name = $1 LIMIT 1',
    [fileName]
  )
  return rows.length > 0
}

async function recordMigration(fileName: string) {
  await db.query(
    'INSERT INTO schema_migrations (file_name) VALUES ($1) ON CONFLICT (file_name) DO NOTHING',
    [fileName]
  )
}

async function runPendingMigrations() {
  console.log('🔎 Checking for pending SQL migrations...')
  await ensureMigrationsTable()

  const migrationsDir = path.join(process.cwd(), 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  let appliedCount = 0

  for (const file of files) {
    const alreadyRun = await hasRun(file)
    if (alreadyRun) {
      continue
    }

    const fullPath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(fullPath, 'utf8')

    console.log(`\n📄 Applying migration: ${file}`)
    try {
      await db.query('BEGIN')
      await db.query(sql)
      await recordMigration(file)
      await db.query('COMMIT')
      appliedCount += 1
      console.log(`✅ Migration applied: ${file}`)
    } catch (error) {
      await db.query('ROLLBACK')
      console.error(`❌ Migration failed (${file}):`, (error as Error).message)
      throw error
    }
  }

  if (appliedCount === 0) {
    console.log('✅ No pending migrations. Database is up to date.')
  } else {
    console.log(`🎉 Completed. ${appliedCount} migration(s) applied.`)
  }
}

runPendingMigrations()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration run failed:', error)
    process.exit(1)
  })

