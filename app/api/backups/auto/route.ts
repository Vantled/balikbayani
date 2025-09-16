// app/api/backups/auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

async function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  // Simple webhook-like endpoint; requires header X-Cron-Secret matching env CRON_SECRET
  const secret = process.env.CRON_SECRET || ''
  const incoming = request.headers.get('x-cron-secret') || ''
  if (!secret || secret !== incoming) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  try {
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
    const id = `${system}-${yyyy}${mm}${dd}-${hh}${mi}${ss}`
    const file = path.join(BACKUP_DIR, `${id}.sql`)
    const res = await db.query(`
      SELECT string_agg(format('CREATE TABLE IF NOT EXISTS %I.%I AS TABLE %I.%I;', schemaname, tablename, schemaname, tablename), '\n') AS sql
      FROM pg_tables WHERE schemaname = 'public';
    `)
    const content = `-- BalikBayani logical backup (auto)\n-- Created at: ${now.toISOString()}\n\n${res.rows?.[0]?.sql || '-- no tables'}\n`
    fs.writeFileSync(file, content, 'utf8')
    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('Auto backup failed', e)
    return NextResponse.json({ success: false, error: 'Auto backup failed' }, { status: 500 })
  }
}


