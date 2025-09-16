// app/api/backups/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

export async function POST(request: NextRequest) {
  // Superadmin only
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  try {
    const form = await request.formData()
    const file = form.get('file') as unknown as File
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    const name = (file as any).name || 'backup.zip'
    const lower = name.toLowerCase()
    if (!(lower.endsWith('.zip') || lower.endsWith('.tar.gz') || lower.endsWith('.sql'))) {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 })
    }
    ensureDir(BACKUP_DIR)
    let target = path.join(BACKUP_DIR, name)
    // Prevent overwrite
    if (fs.existsSync(target)) {
      const base = lower.endsWith('.tar.gz') ? name.slice(0, -7) : name.replace(/\.[^.]+$/, '')
      const ext = lower.endsWith('.tar.gz') ? '.tar.gz' : name.substring(name.lastIndexOf('.'))
      const stamp = Date.now()
      target = path.join(BACKUP_DIR, `${base}-import-${stamp}${ext}`)
    }
    const buf = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(target, buf)
    const id = lower.endsWith('.tar.gz')
      ? path.basename(target).slice(0, -7)
      : path.basename(target).replace(/\.[^.]+$/, '')
    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('Import backup failed', e)
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 })
  }
}


