// scripts/run-direct-hire-migration.ts
import { db } from '../lib/database'
import fs from 'fs'
import path from 'path'

async function runMigration() {
  try {
    console.log('Starting Direct Hire Documents migration...')
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'migrate-direct-hire-documents.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}: ${statement.substring(0, 50)}...`)
        await db.query(statement)
        console.log(`Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('Migration completed successfully!')
    
    // Verify the table was created
    const result = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'direct_hire_documents'"
    )
    
    if (result.rows.length > 0) {
      console.log('✅ direct_hire_documents table created successfully')
    } else {
      console.log('❌ direct_hire_documents table was not created')
    }
    
    // Check if new columns were added
    const columnsResult = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'direct_hire_applications' AND column_name IN ('documents_completed', 'completed_at')"
    )
    
    console.log(`✅ Added ${columnsResult.rows.length} new columns to direct_hire_applications table`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration()
