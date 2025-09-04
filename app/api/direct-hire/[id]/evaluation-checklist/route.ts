// app/api/direct-hire/[id]/evaluation-checklist/route.ts
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
    const { searchParams } = new URL(request.url)
    const override = searchParams.get('override') === 'true'

    // Fetch application
    const application = await DatabaseService.getDirectHireApplicationById(id)
    if (!application) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Application not found' }, { status: 404 })
    }

    // Fetch documents for this application (unified documents table)
    const docs = await DatabaseService.getDocumentsByApplication(id, 'direct_hire')
    const existingChecklist = (docs as any[]).find(d => String(d.document_type) === 'evaluation_requirements_checklist')
    if (existingChecklist && !override) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Checklist already exists', data: { existingId: existingChecklist.id } }, { status: 409 })
    }

    // Helper: get newest doc by any of the provided types
    const getDocByTypes = (...types: string[]) => {
      const lower = types.map(t => t.toLowerCase())
      return docs.find(d => lower.includes(String((d as any).document_type || '').toLowerCase())) as any
    }
    const hasAny = (...types: string[]) => Boolean(getDocByTypes(...types))
    const getMeta = (...types: string[]) => {
      const doc = getDocByTypes(...types)
      return (doc?.meta as any) || {}
    }

    // Map requirements to checks: use U+2713 (check) or NBSP to preserve layout
    const CHECK = '\u2713'
    const EMPTY = '\u00A0'
    const check = (present: boolean) => (present ? CHECK : EMPTY)

    // Load template from public/templates/direct-hire/
    const templatePath = join(process.cwd(), 'public', 'templates', 'direct-hire', 'evaluation-requirements-checklist.docx')
    const template = await readFile(templatePath)

    // Dates
    const createdRaw: any = (application as any).created_at
    let createdDateStr = new Date().toISOString().slice(0, 10)
    if (createdRaw) {
      const d = new Date(createdRaw)
      if (!isNaN(d.getTime())) createdDateStr = d.toISOString().slice(0, 10)
    }

    const formatLongDate = (value?: string) => {
      if (!value) return ''
      const d = new Date(value)
      if (isNaN(d.getTime())) return value
      const year = d.getFullYear()
      const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase()
      const day = String(d.getDate()).padStart(2, '0')
      return `${year} ${month} ${day}`
    }

    const report = await createReport({
      template,
      data: {
        evaluator: application.evaluator || '',
        name: application.name,
        employer: (application as any).employer || '',
        jobsite: application.jobsite,
        position: application.position,
        salary: String(application.salary ?? ''),
        salary_currency: 'USD',
        created_date: formatLongDate(createdDateStr),

        // Checklist checks based on uploaded docs
        passport_check: check(hasAny('passport', 'valid_passport', 'passport_copy')),
        passport_attached: hasAny('passport', 'valid_passport', 'passport_copy') ? 'ATTACHED' : EMPTY,
        passport_number: (getMeta('passport', 'valid_passport', 'passport_copy').passport_number || EMPTY),
        passport_expiry: formatLongDate(getMeta('passport', 'valid_passport', 'passport_copy').passport_expiry) || EMPTY,

        work_visa_check: check(hasAny('work_visa', 'visa', 'visa_work_permit', 'entry_permit')),
        visa_attached: hasAny('work_visa', 'visa', 'visa_work_permit', 'entry_permit') ? 'ATTACHED' : EMPTY,
        visa_type: (getMeta('work_visa', 'visa', 'visa_work_permit', 'entry_permit').visa_type || EMPTY),
        visa_validity: (getMeta('work_visa', 'visa', 'visa_work_permit', 'entry_permit').visa_validity || EMPTY),

        employment_contract_check: check(hasAny('employment_contract', 'offer_of_employment')),
        employment_contract_attached: hasAny('employment_contract', 'offer_of_employment') ? 'ATTACHED' : EMPTY,
        ...(function(){
          const meta = getMeta('employment_contract', 'offer_of_employment')
          const choice: string = meta.ec_verified_polo_check || meta.ec_verification || ''
          return {
            ec_verified_polo_check: check(choice === 'POLO' || choice === 'verified_polo'),
            ec_verified_pe_consulate_check: check(choice === 'PE/Consulate for countries with no POLO' || choice === 'verified_pe_consulate'),
            ec_apostille_polo_verification_check: check(choice === 'Apostille with POLO Verification' || choice === 'apostille_polo_verification'),
            ec_apostille_pe_ack_check: check(choice === 'Apostille with PE Acknowledgement' || choice === 'apostille_pe_ack'),
            ec_notarized_dfa_check: check(choice === 'Notarized Employment Contract for DFA' || choice === 'notarized_dfa'),
            ec_notice_appointment_spain_check: check(choice === 'Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients' || choice === 'notice_appointment_spain'),
            ec_confirmation_sem_check: check(choice === 'Employment Contract with confirmation from SEM' || choice === 'confirmation_sem'),
          }
        })(),
        ec_issued_date: formatLongDate(getMeta('employment_contract', 'offer_of_employment').ec_issued_date) || EMPTY,

        country_specific_check: check(hasAny('country_specific')),
        country_specific_attached: hasAny('country_specific') ? 'ATTACHED' : EMPTY,
        tesda_license_check: check(hasAny('tesda_license', 'tesda', 'prc_license')),
        tesda_license_attached: hasAny('tesda_license', 'tesda', 'prc_license') ? 'ATTACHED' : EMPTY,
        compliance_form_check: check(hasAny('compliance_form')),
        compliance_form_attached: hasAny('compliance_form') ? 'ATTACHED' : EMPTY,
        medical_certificate_check: check(hasAny('medical_certificate')),
        medical_certificate_attached: hasAny('medical_certificate') ? 'ATTACHED' : EMPTY,
        peos_certificate_check: check(hasAny('peos_certificate')),
        peos_certificate_attached: hasAny('peos_certificate') ? 'ATTACHED' : EMPTY,
        clearance_check: check(hasAny('clearance')),
        clearance_attached: hasAny('clearance') ? 'ATTACHED' : EMPTY,
        insurance_coverage_check: check(hasAny('insurance_coverage')),
        insurance_coverage_attached: hasAny('insurance_coverage') ? 'ATTACHED' : EMPTY,
        eregistration_check: check(hasAny('eregistration')),
        eregistration_attached: hasAny('eregistration') ? 'ATTACHED' : EMPTY,
        pdos_certificate_check: check(hasAny('pdos_certificate')),
        pdos_certificate_attached: hasAny('pdos_certificate') ? 'ATTACHED' : EMPTY
      },
      cmdDelimiter: ['{{', '}}']
    })

    // Save DOCX into storage and documents table
    if (existingChecklist && override) {
      await DatabaseService.deleteDocumentById(existingChecklist.id)
    }
    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      `DH-${application.control_number}-evaluation-requirements-checklist.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      application.id,
      'evaluation_requirements_checklist'
    )

    const document = await DatabaseService.createDocument({
      application_id: application.id,
      application_type: 'direct_hire',
      document_type: 'evaluation_requirements_checklist',
      file_name: upload.fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType
    })

    return NextResponse.json<ApiResponse>({ success: true, data: document, message: 'Evaluation checklist generated and attached' })
  } catch (error) {
    console.error('Error generating evaluation checklist:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate evaluation checklist' }, { status: 500 })
  }
}


