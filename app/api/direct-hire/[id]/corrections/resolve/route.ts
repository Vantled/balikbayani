// app/api/direct-hire/[id]/corrections/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService, StaffNotificationService } from '@/lib/services/notification-service'
import { recordAuditLog } from '@/lib/server/audit-logger'
import { FileUploadService } from '@/lib/file-upload-service'
import { DatabaseService } from '@/lib/services/database-service'

// Map technical field keys to user-friendly labels
function getFieldLabel(fieldKey: string): string {
  const fieldLabelMap: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    cellphone: 'Phone Number',
    sex: 'Sex',
    jobsite: 'Job Site',
    position: 'Position',
    job_type: 'Job Type',
    employer: 'Employer',
    raw_salary: 'Salary',
    salary_currency: 'Salary Currency',
    passport_number: 'Passport Number',
    passport_validity: 'Passport Validity',
    visa_category: 'Visa Category',
    visa_type: 'Visa Type',
    visa_number: 'Visa Number',
    visa_validity: 'Visa Validity',
    ec_issued_date: 'Employment Contract Issued Date',
    ec_verification: 'Employment Contract Verification Type',
  }
  
  if (fieldKey.startsWith('document_')) {
    const docType = fieldKey.replace('document_', '')
    const docTypeMap: Record<string, string> = {
      passport: 'Passport',
      work_visa: 'Work Visa',
      employment_contract: 'Employment Contract',
      tesda_license: 'TESDA/PRC License',
      country_specific: 'Country-Specific Document',
      compliance_form: 'Compliance Form',
      medical_certificate: 'Medical Certificate',
      peos_certificate: 'PEOS Certificate',
      clearance: 'Clearance',
      insurance_coverage: 'Insurance Coverage',
      eregistration: 'E-Registration',
      pdos_certificate: 'PDOS Certificate',
    }
    return docTypeMap[docType] || docType
  }
  
  return fieldLabelMap[fieldKey] || fieldKey
}

async function getApplication(id: string) {
  const result = await db.query(
    `SELECT id, applicant_user_id, needs_correction, correction_fields, correction_note
     FROM direct_hire_applications
     WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await AuthService.validateSession(request.cookies.get('bb_auth_token')?.value || '')
    if (!session || session.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const application = await getApplication(id)
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }
    if (application.applicant_user_id !== session.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!application.needs_correction) {
      return NextResponse.json({ success: false, error: 'No active corrections' }, { status: 400 })
    }

    const allowedFields: string[] = Array.isArray(application.correction_fields) ? application.correction_fields : []
    
    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type') || ''
    let payload: Record<string, any> = {}
    const documentFiles: { key: string; file: File; meta?: Record<string, any> }[] = []
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      
      // Map form field names to correction field keys
      const formFieldToCorrectionKey: Record<string, string> = {
        passportNumber: 'passport_number',
        passportExpiry: 'passport_validity',
        visaCategory: 'visa_category',
        visaType: 'visa_type',
        visaNumber: 'visa_number',
        visaValidity: 'visa_validity',
        ecIssuedDate: 'ec_issued_date',
        ecVerification: 'ec_verification',
      }
      
      // List of metadata field names that should only be used for document metadata, not as form fields
      const documentMetaFieldNames = Object.keys(formFieldToCorrectionKey)
      
      // Extract form fields
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Handle document files
          const docTypeMap: Record<string, string> = {
            passport: 'passport',
            workVisa: 'work_visa',
            employmentContract: 'employment_contract',
            tesdaLicense: 'tesda_license',
            countrySpecific: 'country_specific',
            complianceForm: 'compliance_form',
            medicalCertificate: 'medical_certificate',
            peosCertificate: 'peos_certificate',
            clearance: 'clearance',
            insuranceCoverage: 'insurance_coverage',
            eregistration: 'eregistration',
            pdosCertificate: 'pdos_certificate',
          }
          
          const documentType = docTypeMap[key] || key
          const fieldKey = `document_${documentType}`
          
          // Only process if this document field is in allowed correction fields
          if (allowedFields.includes(fieldKey)) {
            const meta: Record<string, any> = {}
            
            // Extract metadata for this document
            // Always extract metadata when document is uploaded to preserve current values
            // Only update metadata if the metadata fields are flagged for correction
            if (documentType === 'passport') {
              const passportNumber = formData.get('passportNumber')?.toString()
              const passportExpiry = formData.get('passportExpiry')?.toString()
              // Include metadata if provided, regardless of whether fields are flagged
              // This preserves existing values when only the document file is updated
              if (passportNumber) {
                meta.passport_number = passportNumber.toUpperCase()
              }
              if (passportExpiry) {
                meta.passport_expiry = passportExpiry
              }
            } else if (documentType === 'work_visa') {
              const visaCategory = formData.get('visaCategory')?.toString()
              const visaType = formData.get('visaType')?.toString()
              const visaNumber = formData.get('visaNumber')?.toString()
              const visaValidity = formData.get('visaValidity')?.toString()
              if (visaCategory) meta.visa_category = visaCategory
              if (visaType) meta.visa_type = visaType
              if (visaNumber) meta.visa_number = visaNumber.toUpperCase()
              if (visaValidity) meta.visa_validity = visaValidity
            } else if (documentType === 'employment_contract') {
              const ecIssuedDate = formData.get('ecIssuedDate')?.toString()
              const ecVerification = formData.get('ecVerification')?.toString()
              if (ecIssuedDate) meta.ec_issued_date = ecIssuedDate
              if (ecVerification) meta.ec_verification = ecVerification
            }
            
            documentFiles.push({ key: fieldKey, file: value, meta })
          }
        } else if (!documentMetaFieldNames.includes(key)) {
          // Regular form field (exclude document metadata field names - they're handled separately)
          // The payload already contains correction field keys, so use them directly
          // Only add if this field is in allowedFields
          if (allowedFields.includes(key)) {
            payload[key] = value.toString()
          }
        }
        // Note: document metadata fields (passportNumber, passportExpiry, etc.) are skipped here
        // They're only used when processing document files above
      }
    } else {
      // Handle JSON
      const body = await request.json()
      payload = body.payload || {}
    }

    // Validate that only allowed fields are present (excluding document fields which are handled separately)
    const nonDocumentFields = Object.keys(payload).filter(key => !key.startsWith('document_'))
    const invalid = nonDocumentFields.filter(key => !allowedFields.includes(key))
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: `You may only update: ${allowedFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Apply form field updates (dynamic set)
    if (nonDocumentFields.length > 0) {
      const sets: string[] = []
      const values: any[] = []
      let idx = 1
      for (const key of nonDocumentFields) {
        sets.push(`${key} = $${idx++}`)
        values.push(payload[key])
      }
      values.push(id)
      await db.query(
        `UPDATE direct_hire_applications SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      )
    }
    
    // Handle document uploads
    for (const { key, file, meta } of documentFiles) {
      try {
        // Map field key back to document type (as stored in database)
        const docType = key.replace('document_', '')
        const docTypeMap: Record<string, string> = {
          passport: 'passport',
          work_visa: 'work_visa', // Database stores as 'work_visa'
          employment_contract: 'employment_contract',
          tesda_license: 'tesda_license',
          country_specific: 'country_specific',
          compliance_form: 'compliance_form',
          medical_certificate: 'medical_certificate',
          peos_certificate: 'peos_certificate',
          clearance: 'clearance',
          insurance_coverage: 'insurance_coverage',
          eregistration: 'eregistration',
          pdos_certificate: 'pdos_certificate',
        }
        const uploadDocType = docTypeMap[docType] || docType
        
        // FileUploadService might expect 'visa' instead of 'work_visa' for the upload path
        // but we store as 'work_visa' in database
        const uploadPathType = uploadDocType === 'work_visa' ? 'visa' : uploadDocType
        
        // Fetch existing document metadata before deleting
        const existingDocResult = await db.query(
          `SELECT meta FROM documents 
           WHERE application_id = $1 AND application_type = 'direct_hire' AND document_type = $2
           LIMIT 1`,
          [id, uploadDocType]
        )
        
        // Preserve existing metadata if it exists
        let existingMeta: Record<string, any> = {}
        if (existingDocResult.rows.length > 0 && existingDocResult.rows[0].meta) {
          existingMeta = typeof existingDocResult.rows[0].meta === 'string' 
            ? JSON.parse(existingDocResult.rows[0].meta) 
            : existingDocResult.rows[0].meta
        }
        
        // Merge existing metadata with new metadata (new metadata takes precedence)
        const finalMeta: Record<string, any> = { ...existingMeta, ...(meta || {}) }
        
        // Upload file
        const uploadInfo = await FileUploadService.uploadFile(file, id, uploadPathType)
        
        // Delete old document of this type if it exists
        await db.query(
          `DELETE FROM documents 
           WHERE application_id = $1 AND application_type = 'direct_hire' AND document_type = $2`,
          [id, uploadDocType]
        )
        
        // Create new document record with merged metadata
        await DatabaseService.createDocument({
          application_id: id,
          application_type: 'direct_hire',
          document_type: uploadDocType,
          file_name: uploadInfo.fileName,
          file_path: uploadInfo.filePath,
          file_size: uploadInfo.fileSize,
          mime_type: uploadInfo.mimeType,
          meta: Object.keys(finalMeta).length > 0 ? finalMeta : undefined,
        })
        
        // Metadata is stored in the documents table's meta column, which is handled by DatabaseService.createDocument
      } catch (error) {
        console.error(`Error uploading document ${key}:`, error)
        // Continue with other documents even if one fails
      }
    }

    // Don't auto-resolve corrections - keep them open for staff to verify
    // Just mark that applicant has resubmitted by clearing needs_correction flag
    // Staff will need to verify and mark corrections as resolved individually
    
    await db.query(
      `UPDATE direct_hire_applications
       SET needs_correction = FALSE,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // Notify staff via audit log and allow existing UI to pull history
    await recordAuditLog(request, {
      action: 'correction_resubmitted',
      tableName: 'direct_hire_applications',
      recordId: id,
      oldValues: { needs_correction: true, correction_fields: allowedFields },
      newValues: { needs_correction: false, correction_fields: null }
    })

    // Notify applicant
    if (application.applicant_user_id) {
      await NotificationService.createNotification(
        application.applicant_user_id,
        'status_change',
        'Application resubmitted after correction',
        'Your updates have been submitted for review.',
        'direct_hire',
        id
      )
    }

    // Notify staff members who flagged the fields that were corrected
    // Get all corrections for the fields that were updated
    // Get the most recent correction for each field_key (including resolved ones)
    // We want to notify the staff member who most recently flagged the field
    const correctionsResult = await db.query(
      `SELECT DISTINCT ON (field_key) field_key, created_by, message, created_at
       FROM direct_hire_corrections
       WHERE application_id = $1 
         AND field_key = ANY($2::text[])
       ORDER BY field_key, created_at DESC`,
      [id, allowedFields]
    )

    // Get application details for notification
    const appDetails = await db.query(
      `SELECT control_number, name FROM direct_hire_applications WHERE id = $1`,
      [id]
    )
    const controlNumber = appDetails.rows[0]?.control_number || ''
    const applicantName = appDetails.rows[0]?.name || 'Applicant'

    // Group corrections by staff member and notify each one
    const staffNotifications = new Map<string, string[]>() // staff_id -> array of field_keys
    
    console.log('Corrections found for notification:', correctionsResult.rows.length, 'for fields:', allowedFields)
    
    for (const correction of correctionsResult.rows) {
      if (correction.created_by) {
        const staffId = correction.created_by
        if (!staffNotifications.has(staffId)) {
          staffNotifications.set(staffId, [])
        }
        const fields = staffNotifications.get(staffId)!
        if (!fields.includes(correction.field_key)) {
          fields.push(correction.field_key)
        }
      } else {
        console.warn('Correction found without created_by:', correction.field_key)
      }
    }

    console.log('Staff to notify:', Array.from(staffNotifications.entries()).map(([id, fields]) => ({ staffId: id, fields })))

    // Send notification to each staff member
    for (const [staffId, fieldKeys] of staffNotifications.entries()) {
      const fieldLabels = fieldKeys.map(key => getFieldLabel(key))
      const fieldsList = fieldLabels.length === 1 
        ? fieldLabels[0]
        : fieldLabels.slice(0, -1).join(', ') + ' and ' + fieldLabels[fieldLabels.length - 1]
      
      const notificationMessage = controlNumber
        ? `Applicant ${applicantName} has resubmitted corrections for the following field(s) in Direct Hire application (Control Number: ${controlNumber}): ${fieldsList}. Please review the corrections.`
        : `Applicant ${applicantName} has resubmitted corrections for the following field(s) in Direct Hire application: ${fieldsList}. Please review the corrections.`

      try {
        console.log(`Sending notification to staff ${staffId} for fields: ${fieldKeys.join(', ')}`)
        // Send one notification per staff member with all their fields
        // Use the first field_key for reference (or null if multiple fields)
        const notification = await StaffNotificationService.createStaffNotification(
          staffId,
          'correction_resubmitted',
          'Correction Resubmitted by Applicant',
          notificationMessage,
          'direct_hire',
          id,
          fieldKeys.length === 1 ? fieldKeys[0] : null
        )
        console.log(`Notification sent successfully to staff ${staffId}:`, notification.id)
      } catch (error) {
        console.error(`Error notifying staff ${staffId}:`, error)
        // Continue with other notifications even if one fails
      }
    }
    
    if (staffNotifications.size === 0) {
      console.warn('No staff members to notify - no corrections found with created_by for fields:', allowedFields)
    }

    return NextResponse.json({ success: true, message: 'Corrections submitted' })
  } catch (error) {
    console.error('Error resolving corrections:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit corrections' }, { status: 500 })
  }
}

