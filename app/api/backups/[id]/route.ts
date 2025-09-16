// app/api/backups/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'
import { isSuperadmin } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('bb_auth_token')?.value
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = await AuthService.validateSession(token)
  if (!user || !isSuperadmin(user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params

  // Try known extensions in order
  const candidates = [
    path.join(BACKUP_DIR, `${id}.tar.gz`),
    path.join(BACKUP_DIR, `${id}.zip`),
    path.join(BACKUP_DIR, `${id}.sql`),
  ]
  const filePath = candidates.find(p => fs.existsSync(p))
  if (!filePath) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const data = fs.readFileSync(filePath)
  const filename = path.basename(filePath)
  let contentType = 'application/octet-stream'
  if (filename.endsWith('.sql')) contentType = 'application/sql; charset=utf-8'
  else if (filename.endsWith('.tar.gz')) contentType = 'application/gzip'
  else if (filename.endsWith('.zip')) contentType = 'application/zip'

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}


