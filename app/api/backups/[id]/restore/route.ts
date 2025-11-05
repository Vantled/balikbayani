// app/api/backups/[id]/restore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { env })
    p.on('error', reject)
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} exited ${c}`))))
  })
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  console.log('[BACKUPS RESTORE ID] Starting restore process...')
  
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) {
    console.log('[BACKUPS RESTORE ID] Unauthorized - no token')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) {
    console.log('[BACKUPS RESTORE ID] Forbidden - user not superadmin')
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  console.log(`[BACKUPS RESTORE ID] Restoring backup with ID: ${id}`)
  
  // Find the matching backup file
  const candidates = [
    path.join(BACKUP_DIR, `${id}.tar.gz`),
    path.join(BACKUP_DIR, `${id}.zip`),
    path.join(BACKUP_DIR, `${id}.sql`),
  ]
  console.log(`[BACKUPS RESTORE ID] Checking for backup files:`, candidates)
  
  const filePath = candidates.find(p => fs.existsSync(p))
  if (!filePath) {
    console.error(`[BACKUPS RESTORE ID] Backup file not found for ID: ${id}`)
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  
  console.log(`[BACKUPS RESTORE ID] Found backup file: ${filePath}`)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-restore-'))
  console.log(`[BACKUPS RESTORE ID] Using temp directory: ${tmpDir}`)
  
  try {
    const extractDir = path.join(tmpDir, 'extracted')
    fs.mkdirSync(extractDir, { recursive: true })
    const lower = filePath.toLowerCase()
    console.log(`[BACKUPS RESTORE ID] File type detected: ${lower.endsWith('.zip') ? 'ZIP' : lower.endsWith('.tar.gz') || lower.endsWith('.tgz') ? 'TAR.GZ' : lower.endsWith('.sql') ? 'SQL' : 'UNKNOWN'}`)

    if (lower.endsWith('.zip')) {
      console.log('[BACKUPS RESTORE ID] Extracting ZIP file...')
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AdmZip = require('adm-zip')
        const zip = new AdmZip(filePath)
        zip.extractAllTo(extractDir, true)
        console.log('[BACKUPS RESTORE ID] ZIP file extracted successfully')
      } catch (e: any) {
        console.error('[BACKUPS RESTORE ID] Failed to extract ZIP file:', e)
        return NextResponse.json({ success: false, error: `Failed to extract zip file: ${e.message || 'Unknown error'}` }, { status: 500 })
      }
    } else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      console.log('[BACKUPS RESTORE ID] Extracting TAR.GZ file...')
      try {
        const tar = (await import('tar')).default as any
        await tar.x({ file: filePath, cwd: extractDir })
        console.log('[BACKUPS RESTORE ID] TAR.GZ file extracted successfully')
      } catch (e: any) {
        console.error('[BACKUPS RESTORE ID] Failed to extract TAR.GZ file:', e)
        return NextResponse.json({ success: false, error: `Failed to extract tar.gz file: ${e.message || 'Unknown error'}` }, { status: 500 })
      }
    } else if (lower.endsWith('.sql')) {
      console.log('[BACKUPS RESTORE ID] Processing SQL file...')
      fs.copyFileSync(filePath, path.join(extractDir, 'dump.sql'))
      fs.mkdirSync(path.join(extractDir, 'uploads'), { recursive: true })
      console.log('[BACKUPS RESTORE ID] SQL file copied successfully')
    }

    // Restore uploads
    console.log('[BACKUPS RESTORE ID] Restoring uploads directory...')
    const uploadsDst = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
    const uploadsSrc = path.join(extractDir, 'uploads')
    if (fs.existsSync(uploadsSrc)) {
      console.log(`[BACKUPS RESTORE ID] Found uploads directory, copying from ${uploadsSrc} to ${uploadsDst}`)
      const copyRecursive = (src: string, dst: string) => {
        for (const entry of fs.readdirSync(src)) {
          const sp = path.join(src, entry)
          const dp = path.join(dst, entry)
          const stat = fs.statSync(sp)
          if (stat.isDirectory()) { if (!fs.existsSync(dp)) fs.mkdirSync(dp, { recursive: true }); copyRecursive(sp, dp) } else { fs.copyFileSync(sp, dp) }
        }
      }
      if (!fs.existsSync(uploadsDst)) fs.mkdirSync(uploadsDst, { recursive: true })
      copyRecursive(uploadsSrc, uploadsDst)
      console.log('[BACKUPS RESTORE ID] Uploads directory restored successfully')
    } else {
      console.log('[BACKUPS RESTORE ID] No uploads directory found in backup')
    }

    // Restore DB if dump.sql exists
    const dumpPath = path.join(extractDir, 'dump.sql')
    console.log(`[BACKUPS RESTORE ID] Checking for dump.sql at: ${dumpPath}`)
    console.log(`[BACKUPS RESTORE ID] dump.sql exists: ${fs.existsSync(dumpPath)}`)
    
    // List all files in extractDir for debugging
    if (fs.existsSync(extractDir)) {
      const files = fs.readdirSync(extractDir, { recursive: true })
      console.log(`[BACKUPS RESTORE ID] Files in extractDir:`, files)
    }
    
    if (fs.existsSync(dumpPath)) {
      const fileSize = fs.statSync(dumpPath).size
      console.log(`[BACKUPS RESTORE ID] Found dump.sql, size: ${fileSize} bytes`)
      
      try {
        const psqlCmd = process.env.PSQL_PATH && process.env.PSQL_PATH.trim() !== '' ? process.env.PSQL_PATH.trim() : 'psql'
        const env = process.env
        const host = env.DB_HOST || env.PGHOST || 'localhost'
        const port = String(env.DB_PORT || env.PGPORT || '5432')
        const dbName = env.DB_NAME || env.PGDATABASE || 'postgres'
        const userName = env.DB_USER || env.PGUSER || 'postgres'
        const pass = env.DB_PASSWORD || env.PGPASSWORD || ''
        
        console.log(`[BACKUPS RESTORE ID] Starting DB restore to ${host}:${port}/${dbName} as ${userName}`)
        
        // Check if psql is available
        try {
          await run(psqlCmd, ['--version'], { ...process.env, PGPASSWORD: pass })
        } catch (versionError) {
          console.warn('[BACKUPS RESTORE ID] psql not available, will use database connection:', versionError)
          // Don't fail here - we'll use database connection instead
        }
        
        // For simple backups with INSERT statements, we can use the database connection directly
        // This avoids requiring psql to be installed on the new device
        const sqlContent = fs.readFileSync(dumpPath, 'utf8')
        console.log(`[BACKUPS RESTORE ID] SQL file preview (first 1000 chars): ${sqlContent.substring(0, 1000)}`)
        
        // Detect backup format - check for our simple backup markers
        const isSimpleBackup = sqlContent.includes('-- BalikBayani logical backup') || 
                               sqlContent.includes('INSERT INTO') ||
                               (sqlContent.includes('CREATE TABLE') === false && sqlContent.length > 0)
        
        console.log(`[BACKUPS RESTORE ID] Backup format detection:`)
        console.log(`[BACKUPS RESTORE ID] - Contains '-- BalikBayani logical backup': ${sqlContent.includes('-- BalikBayani logical backup')}`)
        console.log(`[BACKUPS RESTORE ID] - Contains 'INSERT INTO': ${sqlContent.includes('INSERT INTO')}`)
        console.log(`[BACKUPS RESTORE ID] - Contains 'CREATE TABLE': ${sqlContent.includes('CREATE TABLE')}`)
        console.log(`[BACKUPS RESTORE ID] - Detected as simple backup: ${isSimpleBackup}`)
        
        if (isSimpleBackup) {
          // Simple backup with INSERT statements - execute directly via database connection
          console.log('[BACKUPS] Detected simple backup format with INSERT statements')
          console.log('[BACKUPS] Executing SQL directly via database connection (no psql required)')
          
          try {
            // Parse SQL statements properly - handle multi-line INSERT statements
            // Split by semicolon followed by newline, but preserve multi-line statements
            const lines = sqlContent.split('\n')
            const statements: string[] = []
            let currentStatement = ''
            
            for (const line of lines) {
              const trimmedLine = line.trim()
              
              // Skip comment lines
              if (trimmedLine.startsWith('--') || trimmedLine.length === 0) {
                continue
              }
              
              currentStatement += (currentStatement ? '\n' : '') + line
              
              // If line ends with semicolon, it's a complete statement
              if (trimmedLine.endsWith(';')) {
                const statement = currentStatement.trim()
                if (statement.length > 0) {
                  statements.push(statement)
                }
                currentStatement = ''
              }
            }
            
            // Add any remaining statement
            if (currentStatement.trim().length > 0) {
              statements.push(currentStatement.trim())
            }
            
            console.log(`[BACKUPS] Parsed ${statements.length} SQL statements`)
            
            // Execute statements in a transaction using the transaction helper
            await db.transaction(async (client) => {
              let executedCount = 0
              for (const statement of statements) {
                if (statement.trim()) {
                  try {
                    await client.query(statement)
                    executedCount++
                    if (executedCount % 100 === 0) {
                      console.log(`[BACKUPS] Executed ${executedCount} statements...`)
                    }
                  } catch (stmtError: any) {
                    console.error(`[BACKUPS] Error executing statement ${executedCount + 1}:`, stmtError.message)
                    console.error(`[BACKUPS] Statement was: ${statement.substring(0, 200)}...`)
                    throw stmtError
                  }
                }
              }
              console.log(`[BACKUPS] Successfully executed ${executedCount} statements`)
            })
            
            console.log(`[BACKUPS] DB restore completed from ${dumpPath}`)
          } catch (dbError: any) {
            console.error('[BACKUPS] Database restore via connection failed:', dbError)
            const errorMessage = dbError.message || 'Unknown error'
            const errorDetails = dbError.code ? ` (Error code: ${dbError.code})` : ''
            throw new Error(`Database restore failed: ${errorMessage}${errorDetails}`)
          }
        } else {
          // Full backup (pg_dump format) - try psql first, fallback to database connection
          console.log('[BACKUPS RESTORE ID] Detected full backup format (pg_dump), trying psql first...')
          console.log('[BACKUPS RESTORE ID] Executing psql command...')
          
          try {
            // Use single transaction to avoid partial state; allow clean statements in dump
            await run(psqlCmd, ['-v', 'ON_ERROR_STOP=1', '-h', host, '-p', port, '-U', userName, '-d', dbName, '-f', dumpPath], { ...process.env, PGPASSWORD: pass })
            console.log(`[BACKUPS RESTORE ID] DB restore completed from ${dumpPath} using psql`)
          } catch (psqlError: any) {
            console.warn('[BACKUPS RESTORE ID] psql failed, falling back to database connection:', psqlError.message)
            console.log('[BACKUPS RESTORE ID] Attempting to execute SQL directly via database connection...')
            
            // Fallback: Try to execute SQL directly via database connection
            try {
              // Split SQL into statements
              const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'))
              
              console.log(`[BACKUPS RESTORE ID] Parsed ${statements.length} SQL statements from pg_dump format`)
              
              if (statements.length === 0) {
                throw new Error('No SQL statements found in backup file')
              }
              
              // Execute statements in a transaction
              await db.transaction(async (client) => {
                let executedCount = 0
                for (const statement of statements) {
                  if (statement.trim()) {
                    try {
                      await client.query(statement)
                      executedCount++
                      if (executedCount % 100 === 0) {
                        console.log(`[BACKUPS RESTORE ID] Executed ${executedCount}/${statements.length} statements...`)
                      }
                    } catch (stmtError: any) {
                      // Skip errors for statements that might already exist (like CREATE EXTENSION)
                      if (stmtError.code === '42P07' || stmtError.code === '42710') {
                        console.log(`[BACKUPS RESTORE ID] Skipping statement (already exists): ${stmtError.code}`)
                        executedCount++
                        continue
                      }
                      console.error(`[BACKUPS RESTORE ID] Error executing statement ${executedCount + 1}/${statements.length}:`, stmtError.message)
                      console.error(`[BACKUPS RESTORE ID] Statement was: ${statement.substring(0, 300)}...`)
                      throw stmtError
                    }
                  }
                }
                console.log(`[BACKUPS RESTORE ID] Successfully executed ${executedCount}/${statements.length} statements`)
              })
              
              console.log(`[BACKUPS RESTORE ID] DB restore completed from ${dumpPath} using database connection fallback`)
            } catch (fallbackError: any) {
              console.error('[BACKUPS RESTORE ID] Database connection fallback also failed:', fallbackError)
              throw new Error(`Both psql and database connection restore failed. psql error: ${psqlError.message}, fallback error: ${fallbackError.message}`)
            }
          }
        }
      } catch (restoreError: any) {
        console.error('[BACKUPS RESTORE ID] Database restore failed:', restoreError)
        console.error('[BACKUPS RESTORE ID] Error stack:', restoreError.stack)
        const errorMessage = restoreError?.message || 'Database restore failed'
        return NextResponse.json({ 
          success: false, 
          error: `Database restore failed: ${errorMessage}. Make sure PostgreSQL client tools are installed and the database schema is initialized.` 
        }, { status: 500 })
      }
    } else {
      console.warn('[BACKUPS RESTORE ID] WARNING: No dump.sql file found in backup!')
      console.warn('[BACKUPS RESTORE ID] Database restore was skipped because dump.sql is missing.')
      console.warn('[BACKUPS RESTORE ID] Only file restore will be performed.')
    }

    // Verify what was actually restored
    const dumpPathCheck = path.join(extractDir, 'dump.sql')
    const hadDumpSql = fs.existsSync(dumpPathCheck)
    const uploadsRestored = fs.existsSync(uploadsSrc)
    
    console.log('[BACKUPS RESTORE ID] Restore summary:')
    console.log(`[BACKUPS RESTORE ID] - dump.sql found in backup: ${hadDumpSql ? 'Yes' : 'No'}`)
    console.log(`[BACKUPS RESTORE ID] - Uploads directory found in backup: ${uploadsRestored ? 'Yes' : 'No'}`)
    
    let message = 'Restore completed.'
    if (hadDumpSql) {
      message += ' Database restored.'
    } else {
      message += ' Database restore skipped (no dump.sql in backup).'
    }
    if (uploadsRestored) {
      message += ' Files restored.'
    } else {
      message += ' No files to restore.'
    }
    
    console.log(`[BACKUPS RESTORE ID] ${message}`)
    
    return NextResponse.json({ 
      success: true, 
      message: message,
      details: {
        databaseRestored: hadDumpSql,
        uploadsRestored: uploadsRestored
      }
    })
  } catch (e: any) {
    console.error('[BACKUPS RESTORE ID] Restore failed:', e)
    console.error('[BACKUPS RESTORE ID] Error stack:', e.stack)
    console.error('[BACKUPS RESTORE ID] Error details:', {
      message: e.message,
      code: e.code,
      name: e.name,
      cause: e.cause
    })
    
    const errorMessage = e.message || 'Restore failed'
    const errorDetails = e.code ? ` (Error code: ${e.code})` : ''
    
    return NextResponse.json({ 
      success: false, 
      error: `Restore failed: ${errorMessage}${errorDetails}`,
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 })
  } finally {
    try { 
      console.log('[BACKUPS RESTORE ID] Cleaning up temp directory...')
      fs.rmSync(tmpDir, { recursive: true, force: true })
      console.log('[BACKUPS RESTORE ID] Temp directory cleaned up')
    } catch (cleanupError: any) {
      console.error('[BACKUPS RESTORE ID] Failed to cleanup temp directory:', cleanupError)
    }
  }
}


