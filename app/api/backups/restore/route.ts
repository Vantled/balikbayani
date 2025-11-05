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
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

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
        const AdmZip = (await import('adm-zip')).default as any
        const zip = new AdmZip(uploadPath)
        zip.extractAllTo(extractDir, true)
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to extract zip file' }, { status: 500 })
      }
    } else if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
      const tarCmd = process.env.TAR_PATH && process.env.TAR_PATH.trim() !== '' ? process.env.TAR_PATH.trim() : 'tar'
      await run(tarCmd, ['-xzf', uploadPath, '-C', extractDir])
    } else if (lower.endsWith('.sql')) {
      fs.mkdirSync(path.join(extractDir, 'uploads'), { recursive: true })
      fs.copyFileSync(uploadPath, path.join(extractDir, 'dump.sql'))
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 })
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

    // Restore DB
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
            // Split SQL into statements (handle INSERT statements that may span multiple lines)
            const statements = sqlContent
              .split(';')
              .map(s => s.trim())
              .filter(s => s.length > 0 && !s.startsWith('--'))
            
            // Execute statements in a transaction
            await db.query('BEGIN')
            
            try {
              for (const statement of statements) {
                if (statement.trim()) {
                  await db.query(statement)
                }
              }
              await db.query('COMMIT')
              console.log(`[BACKUPS] DB restore completed from ${dumpPath} (${statements.length} statements executed)`)
            } catch (execError: any) {
              await db.query('ROLLBACK')
              throw execError
            }
          } catch (dbError: any) {
            console.error('[BACKUPS] Database restore via connection failed:', dbError)
            throw new Error(`Database restore failed: ${dbError.message || 'Unknown error'}`)
          }
        } else {
          // Full backup (pg_dump format) - use psql
          console.log('[BACKUPS] Detected full backup format (pg_dump), using psql')
          // Use single transaction to avoid partial state; allow clean statements in dump
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

    console.log('[BACKUPS] File restore completed to uploads directory')
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Restore failed', e)
    return NextResponse.json({ success: false, error: 'Restore failed' }, { status: 500 })
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}


