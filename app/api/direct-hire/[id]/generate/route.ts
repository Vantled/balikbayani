// app/api/direct-hire/[id]/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import createReport from 'docx-templates'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch application
    const application = await DatabaseService.getDirectHireApplicationById(id)
    if (!application) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Application not found' }, { status: 404 })
    }

    // Load template
    const templatePath = join(process.cwd(), 'public', 'templates', 'direct-hire-clearance.docx')
    const template = await readFile(templatePath)

    // Prepare data
    const createdRaw: any = (application as any).created_at
    let createdDateStr = new Date().toISOString().slice(0, 10)
    if (createdRaw) {
      const d = new Date(createdRaw)
      if (!isNaN(d.getTime())) {
        createdDateStr = d.toISOString().slice(0, 10)
      }
    }

    const dateValue = createdDateStr
    const dateCmd: any = () => dateValue
    dateCmd.toString = () => dateValue
    const DATECmd: any = () => dateValue
    DATECmd.toString = () => dateValue

    const report = await createReport({
      template,
      data: {
        control_number: application.control_number,
        name: application.name,
        sex: application.sex,
        job_type: (application as any).job_type || '',
        employer: (application as any).employer || '',
        jobsite: application.jobsite,
        position: application.position,
        salary: String(application.salary ?? ''),
        salary_currency: 'USD',
        evaluator: application.evaluator || '',
        created_date: createdDateStr,
        date: createdDateStr,
        DATE: createdDateStr
      },
      cmdDelimiter: ['{{', '}}'],
      additionalJsContext: {
        date: dateCmd,
        DATE: DATECmd
      }
    })

    // Save DOCX
    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      `DH-${application.control_number}-clearance.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      application.id,
      'clearance'
    )

    // Create document record
    const document = await DatabaseService.createDocument({
      application_id: application.id,
      application_type: 'direct_hire',
      document_type: 'clearance',
      file_name: upload.fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType
    })

    return NextResponse.json<ApiResponse>({ success: true, data: document, message: 'Document generated and attached' })
  } catch (error) {
    console.error('Error generating clearance document:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate document' }, { status: 500 })
  }
}
