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
    let stderr = ''
    let stdout = ''
    
    p.stdout?.on('data', (data) => {
      stdout += data.toString()
    })
    
    p.stderr?.on('data', (data) => {
      stderr += data.toString()
    })
    
    p.on('error', reject)
    p.on('exit', (c) => {
      if (c === 0) {
        resolve()
      } else {
        const errorMsg = stderr || stdout || `${cmd} exited ${c}`
        const error = new Error(errorMsg)
        ;(error as any).code = c
        ;(error as any).stderr = stderr
        ;(error as any).stdout = stdout
        reject(error)
      }
    })
  })
}

// Find psql executable in common locations
function findPsqlPath(): string {
  // If PSQL_PATH is explicitly set, use it
  if (process.env.PSQL_PATH && process.env.PSQL_PATH.trim() !== '') {
    return process.env.PSQL_PATH.trim()
  }
  
  // Common macOS locations for psql
  const commonPaths = [
    '/opt/homebrew/opt/libpq/bin/psql',      // Homebrew (Apple Silicon)
    '/opt/homebrew/opt/postgresql/bin/psql', // Homebrew (Apple Silicon)
    '/usr/local/opt/libpq/bin/psql',        // Homebrew (Intel)
    '/usr/local/opt/postgresql/bin/psql',    // Homebrew (Intel)
    '/usr/bin/psql',                         // System default
    '/usr/local/bin/psql',                   // System default
    '/bin/psql',                             // System default
  ]
  
  // Check for PostgreSQL versions in Library
  for (let version = 17; version >= 12; version--) {
    commonPaths.push(`/Library/PostgreSQL/${version}/bin/psql`)
  }
  
  // Check if any of these paths exist
  for (const psqlPath of commonPaths) {
    if (fs.existsSync(psqlPath)) {
      console.log(`[BACKUPS RESTORE] Found psql at: ${psqlPath}`)
      return psqlPath
    }
  }
  
  // If not found, default to 'psql' (will fail if not in PATH)
  console.warn('[BACKUPS RESTORE] psql not found in common locations, using "psql" (must be in PATH)')
  return 'psql'
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
        
        // List ZIP contents before extraction for debugging
        const zipEntries = zip.getEntries()
        console.log(`[BACKUPS RESTORE] ZIP file contains ${zipEntries.length} entries:`)
        zipEntries.forEach((entry: any, idx: number) => {
          console.log(`[BACKUPS RESTORE]   ${idx + 1}. ${entry.entryName} (${entry.isDirectory ? 'DIR' : 'FILE'})`)
        })
        
        zip.extractAllTo(extractDir, true)
        console.log('[BACKUPS RESTORE] ZIP file extracted successfully')
        
        // Immediately verify what was extracted
        if (fs.existsSync(extractDir)) {
          const immediateFiles = fs.readdirSync(extractDir)
          console.log(`[BACKUPS RESTORE] Files immediately after extraction:`, immediateFiles)
          
          // Check for dump.sql and uploads immediately
          const dumpSqlCheck = path.join(extractDir, 'dump.sql')
          const uploadsCheck = path.join(extractDir, 'uploads')
          console.log(`[BACKUPS RESTORE] dump.sql exists at root: ${fs.existsSync(dumpSqlCheck)}`)
          console.log(`[BACKUPS RESTORE] uploads exists at root: ${fs.existsSync(uploadsCheck)}`)
        }
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
    
    // Check for uploads in multiple possible locations
    const uploadsSrcCandidates = [
      path.join(extractDir, 'uploads'),           // Root of extracted directory
      path.join(extractDir, 'backup', 'uploads'), // In backup subdirectory
    ]
    
    console.log(`[BACKUPS RESTORE] Checking for uploads directory in multiple locations:`)
    uploadsSrcCandidates.forEach((candidate, idx) => {
      console.log(`[BACKUPS RESTORE]   ${idx + 1}. ${candidate} - exists: ${fs.existsSync(candidate)}`)
    })
    
    const uploadsSrc = uploadsSrcCandidates.find(p => fs.existsSync(p))
    
    if (uploadsSrc && fs.existsSync(uploadsSrc)) {
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
    // Check for dump.sql in multiple possible locations
    const dumpPathCandidates = [
      path.join(extractDir, 'dump.sql'),           // Root of extracted directory
      path.join(extractDir, 'backup', 'dump.sql'), // In backup subdirectory
    ]
    
    console.log(`[BACKUPS RESTORE] Checking for dump.sql in multiple locations:`)
    dumpPathCandidates.forEach((candidate, idx) => {
      console.log(`[BACKUPS RESTORE]   ${idx + 1}. ${candidate} - exists: ${fs.existsSync(candidate)}`)
    })
    
    // List all files in extractDir for debugging and search for dump.sql anywhere
    let dumpPath: string | undefined = undefined
    
    if (fs.existsSync(extractDir)) {
      const listFilesRecursive = (dir: string, prefix = ''): { relative: string, absolute: string }[] => {
        const files: { relative: string, absolute: string }[] = []
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
            files.push({ relative: relativePath, absolute: fullPath })
            if (entry.isDirectory()) {
              files.push(...listFilesRecursive(fullPath, relativePath))
            }
          }
        } catch (e) {
          console.error(`[BACKUPS RESTORE] Error listing ${dir}:`, e)
        }
        return files
      }
      const files = listFilesRecursive(extractDir)
      const fileNames = files.map(f => f.relative)
      console.log(`[BACKUPS RESTORE] All files in extractDir (recursive):`, fileNames)
      
      // Look for dump.sql anywhere
      const sqlFiles = files.filter(f => {
        const lower = f.relative.toLowerCase()
        return lower.includes('dump.sql') || (lower.endsWith('.sql') && !lower.includes('backup'))
      })
      
      if (sqlFiles.length > 0) {
        console.log(`[BACKUPS RESTORE] Found SQL files:`, sqlFiles.map(f => f.relative))
        // Use the first SQL file found
        dumpPath = sqlFiles[0].absolute
        console.log(`[BACKUPS RESTORE] Using SQL file: ${dumpPath}`)
      }
      
      // Also look for uploads directory anywhere
      const uploadsDirs = files.filter(f => {
        const lower = f.relative.toLowerCase()
        return lower.includes('uploads') && fs.statSync(f.absolute).isDirectory()
      })
      
      if (uploadsDirs.length > 0) {
        console.log(`[BACKUPS RESTORE] Found uploads directories:`, uploadsDirs.map(f => f.relative))
        // Add found uploads directories to candidates
        uploadsDirs.forEach(uploadDir => {
          if (!uploadsSrcCandidates.includes(uploadDir.absolute)) {
            uploadsSrcCandidates.push(uploadDir.absolute)
            console.log(`[BACKUPS RESTORE] Added uploads directory to candidates: ${uploadDir.absolute}`)
          }
        })
      }
    }
    
    // If not found by searching, try candidate locations
    if (!dumpPath) {
      dumpPath = dumpPathCandidates.find(p => fs.existsSync(p))
      if (dumpPath) {
        console.log(`[BACKUPS RESTORE] Found dump.sql in candidate location: ${dumpPath}`)
      }
    }
    
    if (!dumpPath) {
      console.warn('[BACKUPS RESTORE] WARNING: dump.sql not found in any location')
    }
    
    if (dumpPath && fs.existsSync(dumpPath)) {
      const fileSize = fs.statSync(dumpPath).size
      console.log(`[BACKUPS RESTORE] Found dump.sql, size: ${fileSize} bytes`)
      try {
        const psqlCmd = findPsqlPath()
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
        
        // Read SQL content to detect format
        const sqlContent = fs.readFileSync(dumpPath, 'utf8')
        console.log(`[BACKUPS RESTORE] SQL file preview (first 1000 chars): ${sqlContent.substring(0, 1000)}`)
        
        // Detect backup format - prioritize explicit markers
        const hasSimpleBackupMarker = sqlContent.includes('-- BalikBayani logical backup')
        const hasPgDumpMarker = sqlContent.includes('-- PostgreSQL database dump') || 
                                sqlContent.includes('pg_dump version') ||
                                sqlContent.includes('Dumped by pg_dump')
        
        // Simple backup: has our marker, or has INSERT but no CREATE TABLE (data-only)
        const isSimpleBackup = hasSimpleBackupMarker || 
                               (sqlContent.includes('INSERT INTO') && !sqlContent.includes('CREATE TABLE'))
        
        // pg_dump format: has pg_dump markers, or has both CREATE TABLE and DROP statements
        const isPgDumpFormat = hasPgDumpMarker || 
                               (sqlContent.includes('CREATE TABLE') && 
                                (sqlContent.includes('DROP CONSTRAINT') || sqlContent.includes('ALTER TABLE')))
        
        console.log(`[BACKUPS RESTORE] Backup format detection:`)
        console.log(`[BACKUPS RESTORE] - Contains '-- BalikBayani logical backup': ${hasSimpleBackupMarker}`)
        console.log(`[BACKUPS RESTORE] - Contains pg_dump markers: ${hasPgDumpMarker}`)
        console.log(`[BACKUPS RESTORE] - Contains 'INSERT INTO': ${sqlContent.includes('INSERT INTO')}`)
        console.log(`[BACKUPS RESTORE] - Contains 'CREATE TABLE': ${sqlContent.includes('CREATE TABLE')}`)
        console.log(`[BACKUPS RESTORE] - Contains 'DROP CONSTRAINT': ${sqlContent.includes('DROP CONSTRAINT')}`)
        console.log(`[BACKUPS RESTORE] - Detected as simple backup: ${isSimpleBackup}`)
        console.log(`[BACKUPS RESTORE] - Detected as pg_dump format: ${isPgDumpFormat}`)
        
        if (isSimpleBackup && !isPgDumpFormat) {
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
          // Full backup (pg_dump format) - try psql first, fallback to database connection
          console.log('[BACKUPS RESTORE] Detected full backup format (pg_dump), trying psql first...')
          console.log('[BACKUPS RESTORE] Executing psql command...')
          
          // Check if psql is available
          let psqlAvailable = false
          try {
            await run(psqlCmd, ['--version'], { ...process.env, PGPASSWORD: pass })
            psqlAvailable = true
            console.log('[BACKUPS RESTORE] psql is available')
          } catch (versionError) {
            console.warn('[BACKUPS RESTORE] psql not available, will use database connection:', versionError)
            psqlAvailable = false
          }
          
          if (psqlAvailable) {
            try {
              // Use psql without ON_ERROR_STOP to allow DROP statements to fail gracefully
              // The database connection fallback handles errors better anyway
              console.log(`[BACKUPS RESTORE] Executing psql restore command...`)
              console.log(`[BACKUPS RESTORE] psql command: ${psqlCmd} -h ${host} -p ${port} -U ${userName} -d ${dbName} -f ${dumpPath}`)
              await run(psqlCmd, ['-h', host, '-p', port, '-U', userName, '-d', dbName, '-f', dumpPath], { ...process.env, PGPASSWORD: pass })
              console.log(`[BACKUPS RESTORE] DB restore completed from ${dumpPath} using psql`)
            } catch (psqlError: any) {
              console.warn('[BACKUPS RESTORE] psql failed, falling back to database connection')
              console.warn('[BACKUPS RESTORE] psql error message:', psqlError.message)
              if (psqlError.stderr) {
                console.warn('[BACKUPS RESTORE] psql stderr:', psqlError.stderr.substring(0, 500))
              }
              if (psqlError.stdout) {
                console.warn('[BACKUPS RESTORE] psql stdout:', psqlError.stdout.substring(0, 500))
              }
              console.log('[BACKUPS RESTORE] Attempting to execute SQL directly via database connection...')
              psqlAvailable = false // Fall through to database connection approach
            }
          }
          
          if (!psqlAvailable) {
            // Fallback: Try to execute SQL directly via database connection
            try {
              // Parse SQL into statements - handle pg_dump format carefully
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
              
              console.log(`[BACKUPS RESTORE] Parsed ${statements.length} SQL statements from pg_dump format`)
              
              if (statements.length === 0) {
                throw new Error('No SQL statements found in backup file')
              }
              
              // Execute statements in a transaction
              // For pg_dump format, we need to handle DROP statements more gracefully
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
                      // Skip errors for statements that might already exist or have dependencies
                      // DROP statements in pg_dump can fail due to dependencies - this is often OK
                      if (stmtError.code === '42P07' || stmtError.code === '42710' || 
                          stmtError.code === '2BP01' || stmtError.code === '42P16' || 
                          stmtError.code === '42P17') {
                        console.log(`[BACKUPS RESTORE] Skipping statement (dependency or already exists): ${stmtError.code} - ${stmtError.message.substring(0, 100)}`)
                        executedCount++
                        continue
                      }
                      // For other errors, log but continue if it's a DROP statement
                      if (statement.toUpperCase().includes('DROP') && stmtError.code) {
                        console.warn(`[BACKUPS RESTORE] DROP statement failed (may be OK): ${stmtError.code} - ${stmtError.message.substring(0, 100)}`)
                        executedCount++
                        continue
                      }
                      console.error(`[BACKUPS RESTORE] Error executing statement ${executedCount + 1}/${statements.length}:`, stmtError.message)
                      console.error(`[BACKUPS RESTORE] Error code: ${stmtError.code}`)
                      console.error(`[BACKUPS RESTORE] Statement was: ${statement.substring(0, 300)}...`)
                      throw stmtError
                    }
                  }
                }
                console.log(`[BACKUPS RESTORE] Successfully executed ${executedCount}/${statements.length} statements`)
              })
              
              console.log(`[BACKUPS RESTORE] DB restore completed from ${dumpPath} using database connection fallback`)
            } catch (fallbackError: any) {
              console.error('[BACKUPS RESTORE] Database connection fallback also failed:', fallbackError)
              const psqlMsg = psqlAvailable ? 'psql was available but failed' : 'psql was not available'
              throw new Error(`Database restore failed: ${fallbackError.message}. ${psqlMsg}.`)
            }
          }
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
    const dumpPathCheck = dumpPath || path.join(extractDir, 'dump.sql')
    const hadDumpSql = dumpPath ? fs.existsSync(dumpPath) : false
    const uploadsRestored = uploadsSrc ? fs.existsSync(uploadsSrc) : false
    
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


