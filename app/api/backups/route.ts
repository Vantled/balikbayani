// app/api/backups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

async function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  await ensureDir()
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql') || f.endsWith('.tar.gz') || f.endsWith('.zip'))
  const data = files.map(f => {
    const p = path.join(BACKUP_DIR, f)
    const s = fs.statSync(p)
    const id = path.parse(f).name
    return { id, file_name: f, file_size: s.size, created_at: s.birthtime.toISOString() }
  }).sort((a,b)=> (a.created_at < b.created_at ? 1 : -1))
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const user = await AuthService.validateSession(token)
    if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    await ensureDir()
    const now = new Date()
    const systemRaw = (process.env.SYSTEM_NAME || 'balikbayani').toLowerCase()
    const system = systemRaw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hh = pad(now.getHours())
    const mi = pad(now.getMinutes())
    const ss = pad(now.getSeconds())
    const id = `${system}-${yyyy}${mm}${dd}-${hh}${mi}${ss}` // [system]-[YYYYMMDD]-[HHMMSS]
    const file = path.join(BACKUP_DIR, `${id}.sql`)

    // Simple logical backup: dump public schema via SQL (portable baseline)
    const res = await db.query(`
      SELECT string_agg(format('CREATE TABLE IF NOT EXISTS %I.%I AS TABLE %I.%I;', schemaname, tablename, schemaname, tablename), '\n') AS sql
      FROM pg_tables WHERE schemaname = 'public';
    `)
    const content = `-- BalikBayani logical backup\n-- Created at: ${new Date().toISOString()}\n\n${res.rows?.[0]?.sql || '-- no tables'}\n`
    fs.writeFileSync(file, content, 'utf8')

    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('Backup create failed', e)
    return NextResponse.json({ success: false, error: 'Backup create failed' }, { status: 500 })
  }
}


