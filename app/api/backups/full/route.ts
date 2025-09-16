// app/api/backups/full/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import os from 'os'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function tsId(system: string) {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const h24 = now.getHours()
  const hh12 = ((h24 + 11) % 12) + 1
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const hh = pad(hh12)
  const mi = pad(now.getMinutes())
  return `${system}-${yyyy}${mm}${dd}-${hh}${mi}${ampm}`
}

function sanitizeSystemName(name: string) {
  return (name || 'balikbayani').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function run(cmd: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  // Build filename
  const system = sanitizeSystemName(process.env.SYSTEM_NAME || 'balikbayani')
  const id = tsId(system)
  const workDir = path.join(os.tmpdir(), `bb-full-backup-${id}`)
  ensureDir(workDir)
  ensureDir(BACKUP_DIR)

  try {
    const pgDumpCmd = process.env.PG_DUMP_PATH && process.env.PG_DUMP_PATH.trim() !== '' ? process.env.PG_DUMP_PATH.trim() : 'pg_dump'
    // 1) pg_dump to dump.sql
    const dumpPath = path.join(workDir, 'dump.sql')
    const env = process.env
    const host = env.DB_HOST || env.PGHOST || 'localhost'
    const port = String(env.DB_PORT || env.PGPORT || '5432')
    const dbName = env.DB_NAME || env.PGDATABASE || 'postgres'
    const userName = env.DB_USER || env.PGUSER || 'postgres'
    const pass = env.DB_PASSWORD || env.PGPASSWORD || ''

    // Verify pg_dump availability
    try {
      await run(pgDumpCmd, ['--version'])
    } catch {
      return NextResponse.json({ success: false, error: 'pg_dump not available on host' }, { status: 500 })
    }

    const dumpArgs = [
      `-h`, host,
      `-p`, port,
      `-U`, userName,
      `-d`, dbName,
      `--clean`,
      `--if-exists`,
      `--no-owner`,
      `--no-privileges`,
      `-F`, 'p', // plain SQL
      `-f`, dumpPath,
    ]
    await new Promise<void>((resolve, reject) => {
      const child = spawn(pgDumpCmd, dumpArgs, { env: { ...process.env, PGPASSWORD: pass } })
      child.on('error', reject)
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`))))
    })

    // 2) Copy uploads directory to workDir/uploads
    const uploadsSrc = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
    const uploadsDst = path.join(workDir, 'uploads')
    if (fs.existsSync(uploadsSrc)) {
      ensureDir(uploadsDst)
      // shallow copy preserving structure
      const copyRecursive = (src: string, dst: string) => {
        for (const entry of fs.readdirSync(src)) {
          // Skip backing up previous backups to avoid recursion and size bloat
          if (src === uploadsSrc && entry === 'backups') continue
          const sp = path.join(src, entry)
          const dp = path.join(dst, entry)
          const stat = fs.statSync(sp)
          if (stat.isDirectory()) { ensureDir(dp); copyRecursive(sp, dp) } else { fs.copyFileSync(sp, dp) }
        }
      }
      copyRecursive(uploadsSrc, uploadsDst)
    }

    // 3) tar.gz: [id].tar.gz containing dump.sql and uploads/
    // Produce ZIP by default for cross-platform restore
    const zipPath = path.join(BACKUP_DIR, `${id}.zip`)
    const archiver = await import('archiver')
    const out = fs.createWriteStream(zipPath)
    const archive = archiver.default('zip', { zlib: { level: 9 } })
    await new Promise<void>((resolve, reject) => {
      out.on('close', () => resolve())
      archive.on('error', reject)
      archive.pipe(out)
      archive.file(path.join(workDir, 'dump.sql'), { name: 'dump.sql' })
      if (fs.existsSync(path.join(workDir, 'uploads'))){
        archive.directory(path.join(workDir, 'uploads'), 'uploads')
      }
      archive.finalize()
    })

    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('Full backup failed', e)
    return NextResponse.json({ success: false, error: 'Full backup failed' }, { status: 500 })
  } finally {
    // Cleanup temp
    try { fs.rmSync(workDir, { recursive: true, force: true }) } catch {}
  }
}


