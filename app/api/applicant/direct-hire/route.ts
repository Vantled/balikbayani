// app/api/applicant/direct-hire/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { DatabaseService } from '@/lib/services/database-service'
import { db } from '@/lib/database'
import { FileUploadService } from '@/lib/file-upload-service'
import { convertToUSD } from '@/lib/currency-converter'

const baseChecklist = () => ({
  evaluated: { checked: false, timestamp: null },
  for_confirmation: { checked: false, timestamp: null },
  emailed_to_dhad: { checked: false, timestamp: null },
  received_from_dhad: { checked: false, timestamp: null },
  for_interview: { checked: false, timestamp: null },
})

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized - No authentication token' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Invalid or expired session' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported payload. Please resubmit the form.',
      }, { status: 400 })
    }

    const form = await request.formData()
    const getField = (key: string) => {
      const value = form.get(key)
      return typeof value === 'string' ? value.trim() : ''
    }

    const firstName = getField('firstName')
    const middleName = getField('middleName')
    const lastName = getField('lastName')
    const sex = getField('sex') || 'male'
    const contactEmail = getField('contactEmail') || user.email || ''
    const contactNumber = getField('contactNumber')
    const jobsite = getField('jobsite')
    const position = getField('position')
    const jobType = getField('jobType') || 'professional'
    const employer = getField('employer') || 'NOT SPECIFIED'
    const salaryAmount = getField('salaryAmount')
    const salaryCurrency = getField('salaryCurrency') || 'USD'

    if (!firstName || !lastName || !jobsite || !position || !salaryAmount) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const salaryValue = Number(salaryAmount)
    if (Number.isNaN(salaryValue) || salaryValue <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Salary must be a positive number',
      }, { status: 400 })
    }

    const existing = await db.query(
      'SELECT id FROM direct_hire_applications WHERE applicant_user_id = $1 AND deleted_at IS NULL LIMIT 1',
      [user.id]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'You already have a Direct Hire application on file. Please track its status instead.',
      }, { status: 409 })
    }

    // Convert salary to USD (matching create-application-modal.tsx logic)
    const normalizedCurrency = String(salaryCurrency || 'USD').toUpperCase()
    let salaryUsd = normalizedCurrency === 'USD'
      ? salaryValue
      : convertToUSD(salaryValue, normalizedCurrency)
    // Round to nearest hundredths (matching create-application-modal.tsx)
    salaryUsd = Math.round((salaryUsd + Number.EPSILON) * 100) / 100

    const controlNumber = await DatabaseService.generateDirectHireControlNumber()
    const fullName = [
      firstName.toUpperCase(),
      middleName ? middleName.toUpperCase() : '',
      lastName.toUpperCase(),
    ].filter(Boolean).join(' ')

    const application = await DatabaseService.createDirectHireApplication({
      control_number: controlNumber,
      name: fullName,
      email: contactEmail.toLowerCase(),
      cellphone: contactNumber,
      sex: sex === 'female' ? 'female' : 'male',
      salary: salaryUsd,
      raw_salary: salaryValue,
      salary_currency: normalizedCurrency,
      status: 'pending',
      jobsite: jobsite.toUpperCase(),
      position: position.toUpperCase(),
      job_type: jobType === 'household' ? 'household' : 'professional',
      evaluator: 'APPLICANT PORTAL',
      employer: employer.toUpperCase(),
      status_checklist: baseChecklist(),
      time_received: new Date().toISOString(),
      time_released: null,
      applicant_user_id: user.id,
    })

    const documentsToUpload: { key: string; type: string }[] = [
      { key: 'passport', type: 'passport' },
      { key: 'workVisa', type: 'work_visa' },
      { key: 'employmentContract', type: 'employment_contract' },
      { key: 'tesdaLicense', type: 'tesda_license' },
      { key: 'countrySpecific', type: 'country_specific' },
      { key: 'complianceForm', type: 'compliance_form' },
      { key: 'medicalCertificate', type: 'medical_certificate' },
      { key: 'peosCertificate', type: 'peos_certificate' },
      { key: 'clearance', type: 'clearance' },
      { key: 'insuranceCoverage', type: 'insurance_coverage' },
      { key: 'eregistration', type: 'eregistration' },
      { key: 'pdosCertificate', type: 'pdos_certificate' },
    ]

    for (const doc of documentsToUpload) {
      const file = form.get(doc.key)
      if (file instanceof File && file.size > 0) {
        try {
          const uploadInfo = await FileUploadService.uploadFile(file, application.id, doc.type)
          
          // Prepare metadata for this document type
          const metadata: any = {}
          if (doc.type === 'passport') {
            const passportNumber = getField('passportNumber')
            const passportExpiry = getField('passportExpiry')
            if (passportNumber) metadata.passport_number = passportNumber.toUpperCase()
            if (passportExpiry) metadata.passport_expiry = passportExpiry
          } else if (doc.type === 'work_visa') {
            const visaCategory = getField('visaCategory')
            const visaType = getField('visaType')
            const visaNumber = getField('visaNumber')
            const visaValidity = getField('visaValidity')
            if (visaCategory) metadata.visa_category = visaCategory
            if (visaType) metadata.visa_type = visaType
            if (visaNumber) metadata.visa_number = visaNumber.toUpperCase()
            if (visaValidity) metadata.visa_validity = visaValidity
          } else if (doc.type === 'employment_contract') {
            const ecIssuedDate = getField('ecIssuedDate')
            const ecVerification = getField('ecVerification')
            if (ecIssuedDate) metadata.ec_issued_date = ecIssuedDate
            if (ecVerification) metadata.ec_verification = ecVerification
          }
          
          await DatabaseService.createDocument({
            application_id: application.id,
            application_type: 'direct_hire',
            document_type: doc.type,
            file_name: uploadInfo.fileName,
            file_path: uploadInfo.filePath,
            file_size: uploadInfo.fileSize,
            mime_type: uploadInfo.mimeType,
            meta: Object.keys(metadata).length > 0 ? metadata : undefined,
          })
        } catch (error) {
          console.error(`Failed to upload ${doc.key}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { controlNumber: application.control_number },
      message: 'Application submitted successfully',
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to submit application',
    }, { status: 500 })
  }
}

