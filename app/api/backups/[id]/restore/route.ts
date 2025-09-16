// app/api/backups/[id]/restore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'
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
      const psqlCmd = process.env.PSQL_PATH && process.env.PSQL_PATH.trim() !== '' ? process.env.PSQL_PATH.trim() : 'psql'
      const env = process.env
      const host = env.DB_HOST || env.PGHOST || 'localhost'
      const port = String(env.DB_PORT || env.PGPORT || '5432')
      const dbName = env.DB_NAME || env.PGDATABASE || 'postgres'
      const userName = env.DB_USER || env.PGUSER || 'postgres'
      const pass = env.DB_PASSWORD || env.PGPASSWORD || ''
      await run(psqlCmd, ['-h', host, '-p', port, '-U', userName, '-d', dbName, '-f', dumpPath], { ...process.env, PGPASSWORD: pass })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Inline restore failed', e)
    return NextResponse.json({ success: false, error: 'Restore failed' }, { status: 500 })
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}


