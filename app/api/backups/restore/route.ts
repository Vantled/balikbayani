// app/api/backups/restore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

async function saveUpload(request: NextRequest, dest: string) {
  const form = await request.formData()
  const file = form.get('file') as unknown as File
  if (!file) throw new Error('No file provided')
  const arrayBuffer = await file.arrayBuffer()
  fs.writeFileSync(dest, Buffer.from(arrayBuffer))
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { env })
    p.on('error', reject)
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} exited ${c}`))))
  })
}

export async function POST(request: NextRequest) {
  console.log('[BACKUPS RESTORE] Starting restore process...')
  
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) {
    console.log('[BACKUPS RESTORE] Unauthorized - no token')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) {
    console.log('[BACKUPS RESTORE] Forbidden - user not superadmin')
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  console.log('[BACKUPS RESTORE] User authenticated, starting restore...')
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-restore-'))
  console.log(`[BACKUPS RESTORE] Using temp directory: ${tmpDir}`)
  
  try {
    ensureDir(BACKUP_DIR)
    const uploadPath = path.join(tmpDir, 'backup')
    console.log('[BACKUPS RESTORE] Saving uploaded file...')
    await saveUpload(request, uploadPath)
    console.log('[BACKUPS RESTORE] File saved, checking file type...')

    // Detect type
    const lower = uploadPath.toLowerCase()
    const extractDir = path.join(tmpDir, 'extracted')
    ensureDir(extractDir)
    console.log(`[BACKUPS RESTORE] File type detected: ${lower.endsWith('.zip') ? 'ZIP' : lower.endsWith('.tar.gz') || lower.endsWith('.tgz') ? 'TAR.GZ' : lower.endsWith('.sql') ? 'SQL' : 'UNKNOWN'}`)

    if (lower.endsWith('.zip')) {
      // Extract zip using adm-zip (already in dependencies)
      console.log('[BACKUPS RESTORE] Extracting ZIP file...')
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AdmZip = require('adm-zip')
        const zip = new AdmZip(uploadPath)
        zip.extractAllTo(extractDir, true)
        console.log('[BACKUPS RESTORE] ZIP file extracted successfully')
      } catch (e: any) {
        console.error('[BACKUPS RESTORE] Failed to extract ZIP file:', e)
        return NextResponse.json({ success: false, error: `Failed to extract zip file: ${e.message || 'Unknown error'}` }, { status: 500 })
      }
    } else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      console.log('[BACKUPS RESTORE] Extracting TAR.GZ file...')
      const tarCmd = process.env.TAR_PATH && process.env.TAR_PATH.trim() !== '' ? process.env.TAR_PATH.trim() : 'tar'
      try {
        await run(tarCmd, ['-xzf', uploadPath, '-C', extractDir])
        console.log('[BACKUPS RESTORE] TAR.GZ file extracted successfully')
      } catch (e: any) {
        console.error('[BACKUPS RESTORE] Failed to extract TAR.GZ file:', e)
        return NextResponse.json({ success: false, error: `Failed to extract tar.gz file: ${e.message || 'Unknown error'}` }, { status: 500 })
      }
    } else if (lower.endsWith('.sql')) {
      console.log('[BACKUPS RESTORE] Processing SQL file...')
      fs.mkdirSync(path.join(extractDir, 'uploads'), { recursive: true })
      fs.copyFileSync(uploadPath, path.join(extractDir, 'dump.sql'))
      console.log('[BACKUPS RESTORE] SQL file copied successfully')
    } else {
      console.error('[BACKUPS RESTORE] Unsupported file type:', lower)
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 })
    }

    // Restore uploads
    console.log('[BACKUPS RESTORE] Restoring uploads directory...')
    const uploadsDst = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
    const uploadsSrc = path.join(extractDir, 'uploads')
    if (fs.existsSync(uploadsSrc)) {
      console.log(`[BACKUPS RESTORE] Found uploads directory, copying from ${uploadsSrc} to ${uploadsDst}`)
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
      console.log('[BACKUPS RESTORE] Uploads directory restored successfully')
    } else {
      console.log('[BACKUPS RESTORE] No uploads directory found in backup')
    }

    // Restore DB
    const dumpPath = path.join(extractDir, 'dump.sql')
    console.log(`[BACKUPS RESTORE] Checking for dump.sql at: ${dumpPath}`)
    console.log(`[BACKUPS RESTORE] dump.sql exists: ${fs.existsSync(dumpPath)}`)
    
    // List all files in extractDir for debugging
    if (fs.existsSync(extractDir)) {
      const files = fs.readdirSync(extractDir, { recursive: true })
      console.log(`[BACKUPS RESTORE] Files in extractDir:`, files)
    }
    
    if (fs.existsSync(dumpPath)) {
      const fileSize = fs.statSync(dumpPath).size
      console.log(`[BACKUPS RESTORE] Found dump.sql, size: ${fileSize} bytes`)
      try {
        const psqlCmd = process.env.PSQL_PATH && process.env.PSQL_PATH.trim() !== '' ? process.env.PSQL_PATH.trim() : 'psql'
        const env = process.env
        const host = env.DB_HOST || env.PGHOST || 'localhost'
        const port = String(env.DB_PORT || env.PGPORT || '5432')
        const dbName = env.DB_NAME || env.PGDATABASE || 'postgres'
        const userName = env.DB_USER || env.PGUSER || 'postgres'
        const pass = env.DB_PASSWORD || env.PGPASSWORD || ''
        console.log(`[BACKUPS] Starting DB restore to ${host}:${port}/${dbName} as ${userName}`)
        
        // Check if psql is available
        try {
          await run(psqlCmd, ['--version'], { ...process.env, PGPASSWORD: pass })
        } catch (versionError) {
          console.error('[BACKUPS] psql not available:', versionError)
          return NextResponse.json({ success: false, error: 'psql command not available. Please install PostgreSQL client tools or set PSQL_PATH environment variable.' }, { status: 500 })
        }
        
        // For simple backups with INSERT statements, we can use the database connection directly
        // This avoids requiring psql to be installed on the new device
        const sqlContent = fs.readFileSync(dumpPath, 'utf8')
        const isSimpleBackup = sqlContent.includes('-- BalikBayani logical backup') && sqlContent.includes('INSERT INTO')
        
        if (isSimpleBackup) {
          // Simple backup with INSERT statements - execute directly via database connection
          console.log('[BACKUPS RESTORE] Detected simple backup format with INSERT statements')
          console.log('[BACKUPS RESTORE] Executing SQL directly via database connection (no psql required)')
          console.log(`[BACKUPS RESTORE] SQL file size: ${sqlContent.length} characters`)
          console.log(`[BACKUPS RESTORE] SQL file preview (first 500 chars): ${sqlContent.substring(0, 500)}`)
          
          try {
            // Parse SQL statements properly - handle multi-line INSERT statements
            // Split by semicolon followed by newline, but preserve multi-line statements
            const lines = sqlContent.split('\n')
            console.log(`[BACKUPS RESTORE] Total lines in SQL file: ${lines.length}`)
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
            
            console.log(`[BACKUPS RESTORE] Parsed ${statements.length} SQL statements`)
            if (statements.length === 0) {
              console.warn('[BACKUPS RESTORE] WARNING: No SQL statements found to execute!')
              return NextResponse.json({ 
                success: false, 
                error: 'No SQL statements found in backup file. The backup may be empty or corrupted.' 
              }, { status: 400 })
            }
            
            // Execute statements in a transaction using the transaction helper
            console.log('[BACKUPS RESTORE] Starting database transaction...')
            await db.transaction(async (client) => {
              let executedCount = 0
              for (const statement of statements) {
                if (statement.trim()) {
                  try {
                    await client.query(statement)
                    executedCount++
                    if (executedCount % 100 === 0) {
                      console.log(`[BACKUPS RESTORE] Executed ${executedCount}/${statements.length} statements...`)
                    }
                  } catch (stmtError: any) {
                    console.error(`[BACKUPS RESTORE] Error executing statement ${executedCount + 1}/${statements.length}:`, stmtError.message)
                    console.error(`[BACKUPS RESTORE] Error code: ${stmtError.code}`)
                    console.error(`[BACKUPS RESTORE] Statement was: ${statement.substring(0, 300)}...`)
                    throw stmtError
                  }
                }
              }
              console.log(`[BACKUPS RESTORE] Successfully executed ${executedCount}/${statements.length} statements`)
            })
            
            console.log(`[BACKUPS RESTORE] DB restore completed successfully from ${dumpPath}`)
          } catch (dbError: any) {
            console.error('[BACKUPS RESTORE] Database restore via connection failed:', dbError)
            console.error('[BACKUPS RESTORE] Error stack:', dbError.stack)
            const errorMessage = dbError.message || 'Unknown error'
            const errorDetails = dbError.code ? ` (Error code: ${dbError.code})` : ''
            throw new Error(`Database restore failed: ${errorMessage}${errorDetails}`)
          }
        } else {
          // Full backup (pg_dump format) - use psql
          console.log('[BACKUPS RESTORE] Detected full backup format (pg_dump), using psql')
          console.log('[BACKUPS RESTORE] Executing psql command...')
          // Use single transaction to avoid partial state; allow clean statements in dump
          await run(psqlCmd, ['-v', 'ON_ERROR_STOP=1', '-h', host, '-p', port, '-U', userName, '-d', dbName, '-f', dumpPath], { ...process.env, PGPASSWORD: pass })
          console.log(`[BACKUPS RESTORE] DB restore completed from ${dumpPath}`)
        }
      } catch (restoreError: any) {
        console.error('[BACKUPS RESTORE] Database restore failed:', restoreError)
        console.error('[BACKUPS RESTORE] Error stack:', restoreError.stack)
        const errorMessage = restoreError?.message || 'Database restore failed'
        return NextResponse.json({ 
          success: false, 
          error: `Database restore failed: ${errorMessage}. Make sure PostgreSQL client tools are installed and the database schema is initialized.` 
        }, { status: 500 })
      }
    } else {
      console.warn('[BACKUPS RESTORE] WARNING: No dump.sql file found in backup!')
      console.warn('[BACKUPS RESTORE] Database restore was skipped because dump.sql is missing.')
      console.warn('[BACKUPS RESTORE] Only file restore will be performed.')
    }

    console.log('[BACKUPS RESTORE] File restore completed to uploads directory')
    
    // Verify what was actually restored
    const dumpPathCheck = path.join(extractDir, 'dump.sql')
    const hadDumpSql = fs.existsSync(dumpPathCheck)
    const uploadsRestored = fs.existsSync(uploadsSrc)
    
    console.log('[BACKUPS RESTORE] Restore summary:')
    console.log(`[BACKUPS RESTORE] - dump.sql found in backup: ${hadDumpSql ? 'Yes' : 'No'}`)
    console.log(`[BACKUPS RESTORE] - Uploads directory found in backup: ${uploadsRestored ? 'Yes' : 'No'}`)
    
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
    
    console.log(`[BACKUPS RESTORE] ${message}`)
    
    // Include restore summary in response for debugging
    const responseData = { 
      success: true, 
      message: message,
      details: {
        databaseRestored: hadDumpSql,
        uploadsRestored: uploadsRestored,
        dumpSqlFound: hadDumpSql,
        uploadsFound: uploadsRestored
      }
    }
    
    // Log response data for debugging
    console.log('[BACKUPS RESTORE] Response data:', JSON.stringify(responseData, null, 2))
    
    return NextResponse.json(responseData)
  } catch (e: any) {
    console.error('[BACKUPS RESTORE] Restore failed:', e)
    console.error('[BACKUPS RESTORE] Error stack:', e.stack)
    console.error('[BACKUPS RESTORE] Error details:', {
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
      console.log('[BACKUPS RESTORE] Cleaning up temp directory...')
      fs.rmSync(tmpDir, { recursive: true, force: true })
      console.log('[BACKUPS RESTORE] Temp directory cleaned up')
    } catch (cleanupError: any) {
      console.error('[BACKUPS RESTORE] Failed to cleanup temp directory:', cleanupError)
    }
  }
}


