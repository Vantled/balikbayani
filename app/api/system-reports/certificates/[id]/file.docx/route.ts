// app/api/system-reports/certificates/[id]/file.docx/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { FileUploadService } from '@/lib/file-upload-service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const certificate = await DatabaseService.getSystemReportCertificateById(id)
    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const isDocx = (certificate.mime_type || '').includes('word') || certificate.file_name.toLowerCase().endsWith('.docx')
    if (!isDocx) {
      return NextResponse.json({ error: 'Not a DOCX document' }, { status: 400 })
    }

    const filePath = FileUploadService.getFilePath(certificate.file_path)
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    headers.set('Content-Disposition', `inline; filename="${certificate.file_name}"`)
    headers.set('Content-Length', fileBuffer.length.toString())
    headers.set('Cache-Control', 'no-store')

    return new NextResponse(fileBuffer, { status: 200, headers })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to serve DOCX' }, { status: 500 })
  }
}














