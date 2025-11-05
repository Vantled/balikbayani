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
      return psqlPath
    }
  }
  
  // If not found, default to 'psql' (will fail if not in PATH)
  return 'psql'
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-restore-'))
  
  try {
    ensureDir(BACKUP_DIR)
    const uploadPath = path.join(tmpDir, 'backup')
    await saveUpload(request, uploadPath)

    // Detect type
    const lower = uploadPath.toLowerCase()
    const extractDir = path.join(tmpDir, 'extracted')
    ensureDir(extractDir)

    if (lower.endsWith('.zip')) {
      // Extract zip using adm-zip (already in dependencies)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AdmZip = require('adm-zip')
        const zip = new AdmZip(uploadPath)
        zip.extractAllTo(extractDir, true)
      } catch (e: any) {
        console.error('[BACKUPS RESTORE] Failed to extract ZIP file:', e)
        return NextResponse.json({ success: false, error: `Failed to extract zip file: ${e.message || 'Unknown error'}` }, { status: 500 })
      }
    } else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      const tarCmd = process.env.TAR_PATH && process.env.TAR_PATH.trim() !== '' ? process.env.TAR_PATH.trim() : 'tar'
      try {
        await run(tarCmd, ['-xzf', uploadPath, '-C', extractDir])
      } catch (e: any) {
        console.error('[BACKUPS RESTORE] Failed to extract TAR.GZ file:', e)
        return NextResponse.json({ success: false, error: `Failed to extract tar.gz file: ${e.message || 'Unknown error'}` }, { status: 500 })
      }
    } else if (lower.endsWith('.sql')) {
      fs.mkdirSync(path.join(extractDir, 'uploads'), { recursive: true })
      fs.copyFileSync(uploadPath, path.join(extractDir, 'dump.sql'))
    } else {
      console.error('[BACKUPS RESTORE] Unsupported file type:', lower)
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 })
    }

    // Restore uploads
    const uploadsDst = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
    
    // Check for uploads in multiple possible locations
    const uploadsSrcCandidates = [
      path.join(extractDir, 'uploads'),           // Root of extracted directory
      path.join(extractDir, 'backup', 'uploads'), // In backup subdirectory
    ]
    
    const uploadsSrc = uploadsSrcCandidates.find(p => fs.existsSync(p))
    
    if (uploadsSrc && fs.existsSync(uploadsSrc)) {
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
    }

    // Restore DB
    // Check for dump.sql in multiple possible locations
    const dumpPathCandidates = [
      path.join(extractDir, 'dump.sql'),           // Root of extracted directory
      path.join(extractDir, 'backup', 'dump.sql'), // In backup subdirectory
    ]
    
    // List all files in extractDir and search for dump.sql anywhere
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
      
      // Look for dump.sql anywhere
      const sqlFiles = files.filter(f => {
        const lower = f.relative.toLowerCase()
        return lower.includes('dump.sql') || (lower.endsWith('.sql') && !lower.includes('backup'))
      })
      
      if (sqlFiles.length > 0) {
        dumpPath = sqlFiles[0].absolute
      }
      
      // Also look for uploads directory anywhere
      const uploadsDirs = files.filter(f => {
        const lower = f.relative.toLowerCase()
        return lower.includes('uploads') && fs.statSync(f.absolute).isDirectory()
      })
      
      if (uploadsDirs.length > 0) {
        uploadsDirs.forEach(uploadDir => {
          if (!uploadsSrcCandidates.includes(uploadDir.absolute)) {
            uploadsSrcCandidates.push(uploadDir.absolute)
          }
        })
      }
    }
    
    // If not found by searching, try candidate locations
    if (!dumpPath) {
      dumpPath = dumpPathCandidates.find(p => fs.existsSync(p))
    }
    
    if (dumpPath && fs.existsSync(dumpPath)) {
      try {
        const psqlCmd = findPsqlPath()
        const env = process.env
        const host = env.DB_HOST || env.PGHOST || 'localhost'
        const port = String(env.DB_PORT || env.PGPORT || '5432')
        const dbName = env.DB_NAME || env.PGDATABASE || 'postgres'
        const userName = env.DB_USER || env.PGUSER || 'postgres'
        const pass = env.DB_PASSWORD || env.PGPASSWORD || ''
        
        // Check if psql is available
        try {
          await run(psqlCmd, ['--version'], { ...process.env, PGPASSWORD: pass })
        } catch (versionError) {
          console.error('[BACKUPS] psql not available:', versionError)
          return NextResponse.json({ success: false, error: 'psql command not available. Please install PostgreSQL client tools or set PSQL_PATH environment variable.' }, { status: 500 })
        }
        
        // Read SQL content to detect format
        const sqlContent = fs.readFileSync(dumpPath, 'utf8')
        
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
        
        if (isSimpleBackup && !isPgDumpFormat) {
          // Simple backup with INSERT statements - execute directly via database connection
          try {
            // Parse SQL statements properly - handle multi-line INSERT statements
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
            
            if (statements.length === 0) {
              return NextResponse.json({ 
                success: false, 
                error: 'No SQL statements found in backup file. The backup may be empty or corrupted.' 
              }, { status: 400 })
            }
            
            // Execute statements in a transaction
            await db.transaction(async (client) => {
              for (const statement of statements) {
                if (statement.trim()) {
                  try {
                    await client.query(statement)
                  } catch (stmtError: any) {
                    console.error(`[BACKUPS RESTORE] Error executing statement:`, stmtError.message)
                    throw stmtError
                  }
                }
              }
            })
          } catch (dbError: any) {
            console.error('[BACKUPS RESTORE] Database restore via connection failed:', dbError)
            const errorMessage = dbError.message || 'Unknown error'
            const errorDetails = dbError.code ? ` (Error code: ${dbError.code})` : ''
            throw new Error(`Database restore failed: ${errorMessage}${errorDetails}`)
          }
        } else {
          // Full backup (pg_dump format) - try psql first, fallback to database connection
          // Check if psql is available
          let psqlAvailable = false
          try {
            await run(psqlCmd, ['--version'], { ...process.env, PGPASSWORD: pass })
            psqlAvailable = true
          } catch (versionError) {
            psqlAvailable = false
          }
          
          if (psqlAvailable) {
            try {
              await run(psqlCmd, ['-h', host, '-p', port, '-U', userName, '-d', dbName, '-f', dumpPath], { ...process.env, PGPASSWORD: pass })
            } catch (psqlError: any) {
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
              
              if (statements.length === 0) {
                throw new Error('No SQL statements found in backup file')
              }
              
              // Execute statements in a transaction
              // For pg_dump format, we need to handle DROP statements more gracefully
              await db.transaction(async (client) => {
                for (const statement of statements) {
                  if (statement.trim()) {
                    try {
                      await client.query(statement)
                    } catch (stmtError: any) {
                      // Skip errors for statements that might already exist or have dependencies
                      // DROP statements in pg_dump can fail due to dependencies - this is often OK
                      if (stmtError.code === '42P07' || stmtError.code === '42710' || 
                          stmtError.code === '2BP01' || stmtError.code === '42P16' || 
                          stmtError.code === '42P17') {
                        continue
                      }
                      // For other errors, log but continue if it's a DROP statement
                      if (statement.toUpperCase().includes('DROP') && stmtError.code) {
                        continue
                      }
                      console.error(`[BACKUPS RESTORE] Error executing statement:`, stmtError.message)
                      throw stmtError
                    }
                  }
                }
              })
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
    }
    
    // Verify what was actually restored
    const dumpPathCheck = dumpPath || path.join(extractDir, 'dump.sql')
    const hadDumpSql = dumpPath ? fs.existsSync(dumpPath) : false
    const uploadsRestored = uploadsSrc ? fs.existsSync(uploadsSrc) : false
    
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
    
    return NextResponse.json({
      success: true, 
      message: message,
      details: {
        databaseRestored: hadDumpSql,
        uploadsRestored: uploadsRestored,
        dumpSqlFound: hadDumpSql,
        uploadsFound: uploadsRestored
      }
    })
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
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (cleanupError: any) {
      console.error('[BACKUPS RESTORE] Failed to cleanup temp directory:', cleanupError)
    }
  }
}


