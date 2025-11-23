// app/api/direct-hire/[id]/confirmation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import { ApiResponse } from '@/lib/types'
import { recordDocumentAudit } from '@/lib/server/document-audit'
import createReport from 'docx-templates'
import { buildDirectHireDocxData } from '@/lib/docx-common'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({} as any))
    const { searchParams } = new URL(request.url)
    const override = searchParams.get('override') === 'true'
    // Pull from body or fallback to stored meta on checklist
    const appSc: any = (await DatabaseService.getDirectHireApplicationById(id) as any)?.status_checklist || {}
    const scMeta: any = appSc.for_confirmation_meta || {}
    const verifierType: 'MWO' | 'PEPCG' | 'OTHERS' = body.verifier_type ?? scMeta.verifier_type
    const verifierOffice: string | undefined = body.verifier_office ?? scMeta.verifier_office
    const othersText: string | undefined = body.others_text ?? scMeta.others_text
    const pePcgCity: string | undefined = body.pe_pcg_city ?? scMeta.pe_pcg_city
    const verifiedDate: string | undefined = body.verified_date ?? scMeta.verified_date
    const verificationImageId: string | undefined = body.verification_image_id ?? scMeta.verification_image_id
    const verificationImagePath: string | undefined = body.verification_image_path ?? scMeta.verification_image_path
    const verificationImageName: string | undefined = body.verification_image_name ?? scMeta.verification_image_name
    const verificationImageUrl: string | undefined = body.verification_image_url ?? scMeta.verification_image_url

    if (!verifierType) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Missing verifier_type' }, { status: 400 })
    }
    if (verifierType === 'MWO' && !verifierOffice) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Missing verifier_office for MWO' }, { status: 400 })
    }
    if (verifierType === 'OTHERS' && !othersText) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Missing others_text for Others' }, { status: 400 })
    }

    // Fetch application
    const application = await DatabaseService.getDirectHireApplicationById(id)
    if (!application) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Application not found' }, { status: 404 })
    }

    // Load template
    const templatePath = join(process.cwd(), 'public', 'templates', 'direct-hire', 'mwo-polo-pe-pcg-confirmation.docx')
    const template = await readFile(templatePath)

    // Dates
    const confirmDate = verifiedDate || new Date().toISOString().slice(0, 10)
    const formatLongDate = (value?: string) => {
      if (!value) return ''
      const d = new Date(value)
      if (isNaN(d.getTime())) return value
      const year = d.getFullYear()
      const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase()
      const day = String(d.getDate()).padStart(1, '0')
      return `${day} ${month} ${year}`
    }
    const confirmDateLong = formatLongDate(confirmDate)
    const createdIso = new Date(((application as any)?.created_at || Date.now())).toISOString().slice(0,10)
    const createdLong = formatLongDate(createdIso)
    const dateCmd: any = () => confirmDate
    dateCmd.toString = () => confirmDate
    const DATECmd: any = () => confirmDate
    DATECmd.toString = () => confirmDate

    // Map verifier labels and checklist checks
    const CHECK = '\u2713'
    const EMPTY = '\u00A0'
    const check = (present: boolean) => (present ? CHECK : EMPTY)
    const isMWO = verifierType === 'MWO'
    const isPePcg = verifierType === 'PEPCG'
    const isOthers = verifierType === 'OTHERS'
    let verifierLabel = ''
    if (isMWO) verifierLabel = 'Migrant Workers Office (MWO)'
    if (isPePcg) verifierLabel = 'Philippine Embassy/Consulate (PE/PCG)'
    if (isOthers) verifierLabel = 'Others'

    // Prepare data for template
    const mk = (value: string) => {
      const fn: any = () => value
      fn.toString = () => value
      return fn
    }

    // If a confirmation document already exists and no override flag, return 409
    let docs = await DatabaseService.getDocumentsByApplication(id, 'direct_hire')
    const existing = (docs as any[]).find(d => String((d as any).document_type) === 'confirmation')
    if (existing && !override) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Confirmation already exists', data: { existingId: existing.id } }, { status: 409 })
    }
    // If overriding, remove existing record before writing a new one
    if (existing && override) {
      try { await DatabaseService.deleteDocumentById((existing as any).id) } catch {}
      // Refetch docs after deletion to get fresh data
      docs = await DatabaseService.getDocumentsByApplication(id, 'direct_hire')
    }
    const common = buildDirectHireDocxData(application as any, docs as any)
    const report = await createReport({
      template,
      data: {
        ...common.data,
        applicant_name: application.name,
        created_date: createdLong,
        verifier_type: verifierLabel,
        verified_date: confirmDateLong,
        pe_pcg_verified_date: isPePcg ? confirmDateLong : '',
        date: confirmDate,
        DATE: confirmDate,
        mwo_office: isMWO ? (verifierOffice || '') : '',
        pe_pcg_city: isPePcg ? (pePcgCity || '') : '',
        others_text: isOthers ? (othersText || '') : '',
        verification_image_id: verificationImageId || '',
        verification_image_path: verificationImagePath || '',
        verification_image_name: verificationImageName || '',
        verification_image_url: verificationImageUrl || '',
      },
      cmdDelimiter: ['{{', '}}'],
      additionalJsContext: {
        date: dateCmd,
        DATE: DATECmd,
        ...common.jsCtx,
        applicant_name: mk(application.name),
        created_date: mk(createdLong),
        verified_date: mk(confirmDateLong),
        pe_pcg_verified_date: mk(isPePcg ? confirmDateLong : ''),
        mwo_office: mk(isMWO ? (verifierOffice || '') : ''),
        pe_pcg_city: mk(isPePcg ? (pePcgCity || '') : ''),
        others_text: mk(isOthers ? (othersText || '') : ''),
        verification_image_id: mk(verificationImageId || ''),
        verification_image_path: mk(verificationImagePath || ''),
        verification_image_name: mk(verificationImageName || ''),
        verification_image_url: mk(verificationImageUrl || ''),
      }
    })

    // Save document (filename cannot contain slashes; use hyphens in storage name)
    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      `DH-${application.control_number}-MWO-POLO-PE-PCG Confirmation.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      application.id,
      'confirmation'
    )

    const document = await DatabaseService.createDocument({
      application_id: application.id,
      application_type: 'direct_hire',
      document_type: 'confirmation',
      file_name: upload.fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType
    })

    await recordDocumentAudit(request, 'create', document, {
      newValues: {
        document_name: document.document_type,
        file_name: document.file_name,
      },
      applicationNewValues: {
        document_name: document.document_type,
        file_name: document.file_name,
      },
    })

    return NextResponse.json<ApiResponse>({ success: true, data: document, message: 'Confirmation document generated and attached' })
  } catch (error) {
    console.error('Error generating confirmation document:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate confirmation document' }, { status: 500 })
  }
}


