// app/api/direct-hire/[id]/interview-docs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import FileUploadFs from '@/lib/file-upload'
import createReport from 'docx-templates'
import { buildDirectHireDocxData } from '@/lib/docx-common'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse } from '@/lib/types'
import { readFile as fsReadFile } from 'fs/promises'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const override = searchParams.get('override') === 'true'

    const payload = await request.json().catch(() => ({})) as {
      processed_workers_principal?: number
      processed_workers_las?: number
    }

    // Fetch application
    const application = await DatabaseService.getDirectHireApplicationById(id)
    if (!application) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Application not found' }, { status: 404 })
    }

    // Fetch all documents for this application to find screenshots and detect existing outputs
    const allDocs = await DatabaseService.getDocumentsByApplication(id, 'direct_hire') as any[]
    const screenshotInterviewDocs = (allDocs || []).filter(d => String(d.document_type).toLowerCase() === 'for_interview_screenshot')
    const screenshotConfirmationDocs = (allDocs || []).filter(d => String(d.document_type).toLowerCase() === 'confirmation_verification_image')
    const existingOec = (allDocs || []).find(d => String(d.document_type).toLowerCase() === 'issuance_of_oec_memorandum') as any
    const existingAttach = (allDocs || []).find(d => String(d.document_type).toLowerCase() === 'attachments_screenshots') as any

    if ((existingOec || existingAttach) && !override) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'For Interview documents already exist', data: { existingOecId: existingOec?.id, existingAttachId: existingAttach?.id } }, { status: 409 })
    }

    // Load issuance-of-oec-memorandum template and fill tags
    const oecTemplatePath = join(process.cwd(), 'public', 'templates', 'direct-hire', 'issuance-of-oec-memorandum.docx')
    const oecTemplate = await readFile(oecTemplatePath)

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

    const common = buildDirectHireDocxData(application as any, allDocs as any)
    const oecReport = await createReport({
      template: oecTemplate,
      data: {
        ...common.data,
        created_date: createdDateStr,
        date: createdDateStr,
        DATE: createdDateStr,
        processed_workers_principal: payload.processed_workers_principal ?? common.data.processed_workers_principal ?? '',
        processed_workers_las: payload.processed_workers_las ?? common.data.processed_workers_las ?? ''
      },
      cmdDelimiter: ['{{', '}}'],
      additionalJsContext: {
        date: dateCmd,
        DATE: DATECmd,
        ...common.jsCtx
      }
    })

    // Delete existing docs if overriding
    if (override) {
      try { if (existingOec?.id) await DatabaseService.deleteDocumentById(existingOec.id) } catch {}
      try { if (existingAttach?.id) await DatabaseService.deleteDocumentById(existingAttach.id) } catch {}
    }

    const oecUpload = await FileUploadService.uploadBuffer(
      Buffer.from(oecReport as any),
      `DH-${application.control_number}-Memorandum Issuance of OEC.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      application.id,
      'issuance_of_oec_memorandum'
    )

    const oecDoc = await DatabaseService.createDocument({
      application_id: application.id,
      application_type: 'direct_hire',
      document_type: 'issuance_of_oec_memorandum',
      file_name: oecUpload.fileName,
      file_path: oecUpload.filePath,
      file_size: oecUpload.fileSize,
      mime_type: oecUpload.mimeType
    })

    // Prepare attachments-screenshots with embedded images if available
    const attachTplPath = join(process.cwd(), 'public', 'templates', 'direct-hire', 'attachments-screenshots.docx')
    const attachTpl = await readFile(attachTplPath)

    // Load image buffers for screenshots
    const screenshotsInterview: { data: Buffer; extension: string; width: number; height: number }[] = []
    for (const s of screenshotInterviewDocs) {
      try {
        const fullPath = FileUploadFs.getFilePath((s as any).file_path)
        const buf = await fsReadFile(fullPath)
        const mt = String((s as any).mime_type || '')
        const ext = mt.includes('png') ? '.png' : '.jpg'
        // Smaller size for screenshot1 (For Interview)
        screenshotsInterview.push({ data: Buffer.from(buf), extension: ext, width: 12, height: 4.5 })
      } catch {}
    }
    const screenshotsConfirmation: { data: Buffer; extension: string; width: number; height: number }[] = []
    for (const s of screenshotConfirmationDocs) {
      try {
        const fullPath = FileUploadFs.getFilePath((s as any).file_path)
        const buf = await fsReadFile(fullPath)
        const mt = String((s as any).mime_type || '')
        const ext = mt.includes('png') ? '.png' : '.jpg'
        // Slightly smaller, but wide, for screenshot2 (Confirmation)
        screenshotsConfirmation.push({ data: Buffer.from(buf), extension: ext, width: 18, height: 7.5 })
      } catch {}
    }
    const screenshotsAll = [...screenshotsInterview, ...screenshotsConfirmation]

    const attachmentsReport = await createReport({
      template: attachTpl,
      data: {
        ...common.data,
        date: createdDateStr,
        DATE: createdDateStr,
        processed_workers_principal: payload.processed_workers_principal ?? common.data.processed_workers_principal ?? '',
        processed_workers_las: payload.processed_workers_las ?? common.data.processed_workers_las ?? '',
        screenshot_count: screenshotsAll.length,
        // Provide up to 20 named tags for templates using {{screenshot1}} ... {{screenshot20}}
        screenshot1: screenshotsAll[0] || null,
        screenshot2: screenshotsAll[1] || null,
        screenshot3: screenshotsAll[2] || null,
        screenshot4: screenshotsAll[3] || null,
        screenshot5: screenshotsAll[4] || null,
        screenshot6: screenshotsAll[5] || null,
        screenshot7: screenshotsAll[6] || null,
        screenshot8: screenshotsAll[7] || null,
        screenshot9: screenshotsAll[8] || null,
        screenshot10: screenshotsAll[9] || null,
        screenshot11: screenshotsAll[10] || null,
        screenshot12: screenshotsAll[11] || null,
        screenshot13: screenshotsAll[12] || null,
        screenshot14: screenshotsAll[13] || null,
        screenshot15: screenshotsAll[14] || null,
        screenshot16: screenshotsAll[15] || null,
        screenshot17: screenshotsAll[16] || null,
        screenshot18: screenshotsAll[17] || null,
        screenshot19: screenshotsAll[18] || null,
        screenshot20: screenshotsAll[19] || null
      },
      // Use percent-style delimiters to match template tags like {% image screenshot1 %}
      cmdDelimiter: ['{%', '%}'],
      // Image hooks: tagValue is { data, extension, width, height } and will be returned as-is
      getImage: (tagValue: any) => tagValue,
      // Size is provided in the tagValue; return cm if present
      getImageSize: (_img: any, tagValue: any) => {
        const w = Number(tagValue?.width)
        const h = Number(tagValue?.height)
        return [isFinite(w) ? w : 15, isFinite(h) ? h : 10]
      }
    })

    const attachUpload = await FileUploadService.uploadBuffer(
      Buffer.from(attachmentsReport as any),
      `DH-${application.control_number}-attachments-screenshots.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      application.id,
      'attachments_screenshots'
    )

    const attachDoc = await DatabaseService.createDocument({
      application_id: application.id,
      application_type: 'direct_hire',
      document_type: 'attachments_screenshots',
      file_name: attachUpload.fileName,
      file_path: attachUpload.filePath,
      file_size: attachUpload.fileSize,
      mime_type: attachUpload.mimeType
    })

    return NextResponse.json<ApiResponse>({ success: true, data: { oec: oecDoc, attachments: attachDoc }, message: 'For Interview documents generated and attached' })
  } catch (error) {
    console.error('Error generating For Interview documents:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate For Interview documents' }, { status: 500 })
  }
}


