// app/api/direct-hire/[id]/comprehensive-clearance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import createReport from 'docx-templates'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse } from '@/lib/types'
import { buildDirectHireDocxData } from '@/lib/docx-common'

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

    // Check if comprehensive clearance already exists
    const existingDocs = await DatabaseService.getDocumentsByApplication(id, 'direct_hire')
    const existingClearance = existingDocs?.find(d => d.document_type === 'comprehensive_clearance')

    if (existingClearance && !override) {
      return NextResponse.json<ApiResponse>({ 
        success: false, 
        error: 'Comprehensive clearance document already exists. Use ?override=true to replace it.' 
      }, { status: 409 })
    }

    // Delete existing comprehensive clearance if override is true
    if (existingClearance && override) {
      try {
        await DatabaseService.deleteDocumentById(existingClearance.id)
      } catch (error) {
        console.warn('Failed to delete existing comprehensive clearance:', error)
      }
    }

    // Load the comprehensive clearance template
    const templatePath = join(process.cwd(), 'public', 'templates', 'direct-hire', 'comprehensive-clearance.docx')
    const template = await readFile(templatePath)

    // Prepare comprehensive data from all sources
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

    // Long date formatter (e.g., 27 AUGUST 2025)
    const formatLongDate = (value?: string) => {
      if (!value) return ''
      const d = new Date(value)
      if (isNaN(d.getTime())) return value
      const year = d.getFullYear()
      const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase()
      const day = String(d.getDate()).padStart(2, '0')
      return `${day} ${month} ${year}`
    }

    // Get all related documents and their metadata
    const allDocs = await DatabaseService.getDocumentsByApplication(id, 'direct_hire')
    // Gather screenshots for embedding
    const interviewShots = (allDocs || []).filter(d => {
      const type = String((d as any).document_type || '').toLowerCase()
      const name = String((d as any).file_name || '').toLowerCase()
      const isType = type === 'for_interview_screenshot'
      const isName = name.includes('for interview screenshot')
      return isType || isName
    }) as any[]
    const confirmShots = (allDocs || []).filter(d => {
      const type = String((d as any).document_type || '').toLowerCase()
      const name = String((d as any).file_name || '').toLowerCase()
      const isType = type === 'confirmation_verification_image'
      const isName = name.includes('confirmation verification image')
      return isType || isName
    }) as any[]
    
    // Extract metadata from application fields and fall back to status_checklist meta
    const sc: any = (application as any).status_checklist || {}
    const evaluationMeta = application.evaluation_meta ? JSON.parse(application.evaluation_meta) : (sc.evaluation_meta || {})
    const interviewMeta = application.for_interview_meta ? JSON.parse(application.for_interview_meta) : (sc.for_interview_meta || {})
    const confirmationMeta = application.confirmation_meta ? JSON.parse(application.confirmation_meta) : (sc.for_confirmation_meta || {})
    
    console.log('[Comprehensive] interviewMeta:', interviewMeta)
    console.log('[Comprehensive] sc.for_interview_meta:', sc.for_interview_meta)

    // Derive confirmation-related checks similar to confirmation route
    const CHECK = '\u2713'
    const EMPTY = '\u00A0'
    const verifierType = String(confirmationMeta.verifier_type || '').toUpperCase()
    const isMWO = verifierType === 'MWO'
    const isPePcg = verifierType === 'PEPCG'
    const isOthers = verifierType === 'OTHERS'
    const check = (present: boolean) => (present ? CHECK : EMPTY)

    // Helper to get doc meta by types
    const getDocMeta = (...types: string[]) => {
      const lower = types.map(t => t.toLowerCase())
      const doc = (allDocs || []).find(d => lower.includes(String((d as any).document_type || '').toLowerCase())) as any
      return (doc?.meta as any) || {}
    }

    // Prepare comprehensive data object with all possible tags
    const comprehensiveData = {
      // Basic application info
      control_number: application.control_number,
      name: application.name,
      email: (application as any).email || '',
      cellphone: (application as any).cellphone || '',
      passport_number: (evaluationMeta.passport_number || confirmationMeta.passport_number || (application as any).passport_number || ''),
      passport_expiry: (evaluationMeta.passport_expiry || confirmationMeta.passport_expiry || (application as any).passport_expiry || ''),
      sex: application.sex,
      job_type: (application as any).job_type || '',
      employer: (application as any).employer || '',
      jobsite: application.jobsite,
      position: application.position,
      salary: String(application.salary ?? ''),
      salary_currency: (application as any).salary_currency || 'USD',
      evaluator: application.evaluator || '',
      created_date: formatLongDate(createdDateStr),
      date: createdDateStr,
      DATE: createdDateStr,

      // Evaluation metadata
      evaluation_date: evaluationMeta.evaluation_date || '',
      evaluation_notes: evaluationMeta.evaluation_notes || '',
      evaluation_status: evaluationMeta.evaluation_status || '',

      // Interview metadata
      processed_workers_principal: String(interviewMeta.processed_workers_principal !== undefined ? interviewMeta.processed_workers_principal : ''),
      processed_workers_las: String(interviewMeta.processed_workers_las !== undefined ? interviewMeta.processed_workers_las : ''),
      interview_date: interviewMeta.interview_date || '',
      interview_notes: interviewMeta.interview_notes || '',

      // Confirmation metadata
      confirmation_date: confirmationMeta.confirmation_date || '',
      confirmation_notes: confirmationMeta.confirmation_notes || '',
      confirmation_status: confirmationMeta.confirmation_status || '',
      // Common confirmation tags used in templates
      verifier_type: verifierType || '',
      verified_date: formatLongDate(confirmationMeta.verified_date || ''),
      pe_pcg_verified_date: isPePcg ? formatLongDate(confirmationMeta.verified_date || '') : '',
      mwo_check: check(isMWO),
      pe_pcg_check: check(isPePcg),
      others_check: check(isOthers),
      mwo_office: isMWO ? (confirmationMeta.verifier_office || '') : '',
      pe_pcg_city: isPePcg ? (confirmationMeta.pe_pcg_city || '') : '',
      others_text: isOthers ? (confirmationMeta.others_text || '') : '',

      // Document counts
      total_documents: allDocs?.length || 0,
      important_documents: allDocs?.filter(d => {
        const type = (d.document_type || '').toLowerCase()
        return ['dmw_clearance_request', 'evaluation_requirements_checklist', 'issuance_of_oec_memorandum', 'confirmation', 'clearance'].includes(type)
      }).length || 0,

      // Status information
      current_status: application.status || '',
      status_updated_at: application.updated_at || createdDateStr,

      // Additional fields that might be useful
      application_id: application.id,
      created_at: createdDateStr,
      updated_at: application.updated_at || createdDateStr
    }

    // Generate the comprehensive clearance document
    // Helper to expose values as both callable and string to avoid sandbox ReferenceError when used as command
    const mk = (value: string) => { const fn: any = () => value; fn.toString = () => value; return fn }

    console.log('[Comprehensive] Before buildDirectHireDocxData - interviewMeta:', interviewMeta)
    console.log('[Comprehensive] Before buildDirectHireDocxData - sc.for_interview_meta:', sc.for_interview_meta)
    const common = buildDirectHireDocxData(application as any, allDocs as any)
    console.log('[Comprehensive] After buildDirectHireDocxData - processed_workers_principal:', common.data.processed_workers_principal)
    console.log('[Comprehensive] After buildDirectHireDocxData - processed_workers_las:', common.data.processed_workers_las)

    // Load screenshot buffers
    const shotList: { data: Buffer; extension: string; width: number; height: number }[] = []
    for (const s of interviewShots) {
      try {
        // Handle both relative paths (uploads/...) and absolute paths
        let full: string
        const filePath = (s as any).file_path
        if (filePath.startsWith('uploads/') || filePath.startsWith('uploads\\')) {
          full = FileUploadService.getFilePath(filePath)
        } else if (filePath.startsWith('direct_hire/') || filePath.startsWith('direct_hire\\')) {
          // Convert direct_hire path to uploads/direct_hire path
          const correctedPath = filePath.replace(/^direct_hire[\/\\]/, 'uploads/direct_hire/')
          full = FileUploadService.getFilePath(correctedPath)
        } else {
          full = FileUploadService.getFilePath(filePath)
        }
        console.log('[Comprehensive] Processing interview shot:', filePath, '->', full)
        console.log('[Comprehensive] File exists check:', require('fs').existsSync(full))
        const buf = await readFile(full)
        const mt = String((s as any).mime_type || '')
        const ext = mt.includes('png') ? '.png' : '.jpg'
        shotList.push({ data: Buffer.from(buf), extension: ext, width: 12, height: 4.5 })
        console.log('[Comprehensive] Added interview shot to shotList')
      } catch (e) {
        console.log('[Comprehensive] Failed to load interview shot:', e)
      }
    }
    for (const s of confirmShots) {
      try {
        // Handle both relative paths (uploads/...) and absolute paths
        let full: string
        const filePath = (s as any).file_path
        if (filePath.startsWith('uploads/') || filePath.startsWith('uploads\\')) {
          full = FileUploadService.getFilePath(filePath)
        } else if (filePath.startsWith('direct_hire/') || filePath.startsWith('direct_hire\\')) {
          // Convert direct_hire path to uploads/direct_hire path
          const correctedPath = filePath.replace(/^direct_hire[\/\\]/, 'uploads/direct_hire/')
          full = FileUploadService.getFilePath(correctedPath)
        } else {
          full = FileUploadService.getFilePath(filePath)
        }
        console.log('[Comprehensive] Processing confirmation shot:', filePath, '->', full)
        console.log('[Comprehensive] File exists check:', require('fs').existsSync(full))
        const buf = await readFile(full)
        const mt = String((s as any).mime_type || '')
        const ext = mt.includes('png') ? '.png' : '.jpg'
        shotList.push({ data: Buffer.from(buf), extension: ext, width: 18, height: 7.5 })
        console.log('[Comprehensive] Added confirmation shot to shotList')
      } catch (e) {
        console.log('[Comprehensive] Failed to load confirmation shot:', e)
      }
    }

    // Fallbacks for passport from document meta if not provided
    const passportMeta = getDocMeta('passport', 'valid_passport', 'passport_copy')
    if (!comprehensiveData.passport_number && passportMeta.passport_number) {
      ;(comprehensiveData as any).passport_number = passportMeta.passport_number
    }
    if (!comprehensiveData.passport_expiry && passportMeta.passport_expiry) {
      ;(comprehensiveData as any).passport_expiry = passportMeta.passport_expiry
    }

    console.log('[Comprehensive] processed_workers_principal:', comprehensiveData.processed_workers_principal)
    console.log('[Comprehensive] processed_workers_las:', comprehensiveData.processed_workers_las)
    console.log('[Comprehensive] common.processed_workers_principal:', common.data.processed_workers_principal)
    console.log('[Comprehensive] common.processed_workers_las:', common.data.processed_workers_las)
    console.log('[Comprehensive] screenshots found:', shotList.length)
    console.log('[Comprehensive] interviewShots:', interviewShots.length, 'confirmShots:', confirmShots.length)
    console.log('[Comprehensive] Final data keys:', Object.keys({...common.data, ...comprehensiveData}))
    console.log('[Comprehensive] screenshot1 data:', shotList[0] ? 'present' : 'missing')
    console.log('[Comprehensive] screenshot2 data:', shotList[1] ? 'present' : 'missing')

    const report = await createReport({
      template,
      data: {
        ...common.data, // Use common data first (has correct processed_workers values)
        ...comprehensiveData, // Then override with comprehensive data
        screenshot_count: shotList.length,
        // Screenshots for {%image ...%} tags
        screenshot1: shotList[0] || null,
        screenshot2: shotList[1] || null,
        screenshot3: shotList[2] || null,
        screenshot4: shotList[3] || null,
        screenshot5: shotList[4] || null,
        screenshot6: shotList[5] || null,
        screenshot7: shotList[6] || null,
        screenshot8: shotList[7] || null,
        screenshot9: shotList[8] || null,
        screenshot10: shotList[9] || null
      },
      // Use both delimiters: {{ }} for text and {% %} for images
      cmdDelimiter: ['{{', '}}', '{%', '%}'],
      additionalJsContext: {
        date: dateCmd,
        DATE: DATECmd,
        ...common.jsCtx,
        // Expose common fields as callable as well
        name: mk(application.name || ''),
        applicant_name: mk(application.name || ''),
        position: mk(application.position || ''),
        jobsite: mk(application.jobsite || ''),
        employer: mk((application as any).employer || ''),
        evaluator: mk(application.evaluator || ''),
        created_date: mk(formatLongDate(createdDateStr)),
        passport_number: mk((comprehensiveData as any).passport_number || ''),
        passport_expiry: mk((comprehensiveData as any).passport_expiry || ''),
        verified_date: mk(formatLongDate(confirmationMeta.verified_date || '')),
        pe_pcg_verified_date: mk(isPePcg ? formatLongDate(confirmationMeta.verified_date || '') : ''),
        mwo_office: mk(isMWO ? (confirmationMeta.verifier_office || '') : ''),
        pe_pcg_city: mk(isPePcg ? (confirmationMeta.pe_pcg_city || '') : ''),
        others_text: mk(isOthers ? (confirmationMeta.others_text || '') : ''),
        mwo_check: mk(check(isMWO)),
        pe_pcg_check: mk(check(isPePcg)),
        others_check: mk(check(isOthers)),
      },
      // Image hooks for {%image ...%} tags
      getImage: (tagValue: any) => {
        // For {%image screenshot1%} format, tagValue should be the image object
        return tagValue
      },
      getImageSize: (_img: any, tagValue: any) => {
        const w = Number(tagValue?.width)
        const h = Number(tagValue?.height)
        return [isFinite(w) ? w : 15, isFinite(h) ? h : 10]
      },
      getImageType: (tagValue: any) => {
        return tagValue?.extension || '.png'
      }
    })

    // Save the comprehensive clearance document
    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      `DH-${application.control_number}-Comprehensive-Clearance.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      application.id,
      'comprehensive_clearance'
    )

    // Create document record
    const document = await DatabaseService.createDocument({
      application_id: application.id,
      application_type: 'direct_hire',
      document_type: 'comprehensive_clearance',
      file_name: upload.fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType
    })

    // Optional debug snapshot
    const debug = {
      processed_workers_principal: comprehensiveData.processed_workers_principal,
      processed_workers_las: comprehensiveData.processed_workers_las,
      screenshots_found: shotList.length,
      has_interview_shot: interviewShots.length,
      has_confirmation_shot: confirmShots.length,
      passport_number: (comprehensiveData as any).passport_number,
      passport_expiry: (comprehensiveData as any).passport_expiry
    }

    return NextResponse.json<ApiResponse>({ 
      success: true, 
      data: { document, debug }, 
      message: 'Comprehensive clearance document generated successfully' 
    })
  } catch (error) {
    console.error('Error generating comprehensive clearance document:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json<ApiResponse>({ 
      success: false, 
      error: `Failed to generate comprehensive clearance document: ${errorMessage}` 
    }, { status: 500 })
  }
}
