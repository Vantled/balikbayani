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
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  // Find the matching backup file
  const candidates = [
    path.join(BACKUP_DIR, `${id}.tar.gz`),
    path.join(BACKUP_DIR, `${id}.zip`),
    path.join(BACKUP_DIR, `${id}.sql`),
  ]
  const filePath = candidates.find(p => fs.existsSync(p))
  if (!filePath) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-restore-'))
  try {
    const extractDir = path.join(tmpDir, 'extracted')
    fs.mkdirSync(extractDir, { recursive: true })
    const lower = filePath.toLowerCase()

    if (lower.endsWith('.zip')) {
      try {
        const AdmZip = (await import('adm-zip')).default as any
        const zip = new AdmZip(filePath)
        zip.extractAllTo(extractDir, true)
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to extract zip (missing adm-zip?)' }, { status: 500 })
      }
    } else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      try {
        const tar = (await import('tar')).default as any
        await tar.x({ file: filePath, cwd: extractDir })
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to extract tar.gz' }, { status: 500 })
      }
    } else if (lower.endsWith('.sql')) {
      fs.copyFileSync(filePath, path.join(extractDir, 'dump.sql'))
      fs.mkdirSync(path.join(extractDir, 'uploads'), { recursive: true })
    }

    // Restore uploads
    const uploadsDst = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
    const uploadsSrc = path.join(extractDir, 'uploads')
    if (fs.existsSync(uploadsSrc)) {
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

    // Restore DB if dump.sql exists
    const dumpPath = path.join(extractDir, 'dump.sql')
    if (fs.existsSync(dumpPath)) {
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
          // Full backup (pg_dump format) - use psql
          console.log('[BACKUPS] Detected full backup format (pg_dump), using psql')
          await run(psqlCmd, ['-v', 'ON_ERROR_STOP=1', '-h', host, '-p', port, '-U', userName, '-d', dbName, '-f', dumpPath], { ...process.env, PGPASSWORD: pass })
          console.log(`[BACKUPS] DB restore completed from ${dumpPath}`)
        }
      } catch (restoreError: any) {
        console.error('[BACKUPS] Database restore failed:', restoreError)
        const errorMessage = restoreError?.message || 'Database restore failed'
        return NextResponse.json({ 
          success: false, 
          error: `Database restore failed: ${errorMessage}. Make sure PostgreSQL client tools are installed and the database schema is initialized.` 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Inline restore failed', e)
    return NextResponse.json({ success: false, error: 'Restore failed' }, { status: 500 })
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}


