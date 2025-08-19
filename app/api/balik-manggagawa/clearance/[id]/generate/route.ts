// app/api/balik-manggagawa/clearance/[id]/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import createReport from 'docx-templates'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse } from '@/lib/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const clearance = await DatabaseService.getBalikManggagawaClearanceById(id)
    if (!clearance) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Clearance not found' }, { status: 404 })
    }

    // Reuse existing template for now. You can add type-specific templates later.
    const templatePath = join(process.cwd(), 'public', 'templates', 'direct-hire-clearance.docx')
    const template = await readFile(templatePath)

    const createdRaw: any = (clearance as any).created_at
    let createdDateStr = new Date().toISOString().slice(0, 10)
    if (createdRaw) {
      const d = new Date(createdRaw)
      if (!isNaN(d.getTime())) createdDateStr = d.toISOString().slice(0, 10)
    }

    const report = await createReport({
      template,
      data: {
        control_number: clearance.control_number,
        name: clearance.name_of_worker,
        sex: clearance.sex,
        employer: clearance.employer,
        jobsite: clearance.destination, // map as jobsite-equivalent
        position: '',
        salary: String(clearance.salary ?? ''),
        salary_currency: 'USD',
        evaluator: '',
        created_date: createdDateStr,
        date: createdDateStr,
        DATE: createdDateStr,
        clearance_type: clearance.clearance_type
      },
      cmdDelimiter: ['{{', '}}']
    })

    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      `BM-${clearance.control_number}-clearance.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      clearance.id,
      'clearance'
    )

    const document = await DatabaseService.createDocument({
      application_id: clearance.id,
      application_type: 'balik_manggagawa_clearance',
      document_type: 'clearance',
      file_name: upload.fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType
    })

    return NextResponse.json<ApiResponse>({ success: true, data: document, message: 'Document generated and attached' })
  } catch (error) {
    console.error('Error generating BM clearance document:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate document' }, { status: 500 })
  }
}


