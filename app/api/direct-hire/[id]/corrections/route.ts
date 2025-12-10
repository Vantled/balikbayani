// app/api/direct-hire/[id]/corrections/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService } from '@/lib/services/notification-service'
import EmailService from '@/lib/services/email-service'
import { recordAuditLog } from '@/lib/server/audit-logger'

type CorrectionItem = { field_key: string; message: string }

// Map technical field keys to user-friendly labels
function getFieldLabel(fieldKey: string): string {
  const fieldLabelMap: Record<string, string> = {
    // Basic information fields
    name: 'Name',
    email: 'Email',
    cellphone: 'Phone Number',
    sex: 'Sex',
    
    // Employment fields
    jobsite: 'Job Site',
    position: 'Position',
    job_type: 'Job Type',
    employer: 'Employer',
    salary: 'Salary',
    raw_salary: 'Salary',
    salary_currency: 'Salary Currency',
    evaluator: 'Evaluator',
    
    // Passport fields
    passport_number: 'Passport Number',
    passport_validity: 'Passport Validity',
    
    // Visa fields
    visa_category: 'Visa Category',
    visa_type: 'Visa Type',
    visa_number: 'Visa Number',
    visa_validity: 'Visa Validity',
    
    // Employment Contract fields
    ec_issued_date: 'Employment Contract Issued Date',
    ec_verification: 'Employment Contract Verification Type',
    
    // Document fields (format: document_{document_type})
  }
  
  // Handle document fields (e.g., document_passport -> Passport)
  if (fieldKey.startsWith('document_')) {
    const docType = fieldKey.replace('document_', '')
    // Convert snake_case to Title Case
    return docType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  // Return mapped label or format the key as fallback
  return fieldLabelMap[fieldKey] || fieldKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function getApplicationWithUser(id: string) {
  const result = await db.query(
    `SELECT dha.*, u.email AS applicant_email
     FROM direct_hire_applications dha
     LEFT JOIN users u ON u.id = dha.applicant_user_id
     WHERE dha.id = $1`,
    [id]
  )
  return result.rows[0]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const includeResolved = searchParams.get('include_resolved') === 'true'
  
  const query = includeResolved
    ? `SELECT id, application_id, field_key, message, created_by, resolved_at, created_at
       FROM direct_hire_corrections
       WHERE application_id = $1
       ORDER BY created_at ASC`
    : `SELECT id, application_id, field_key, message, created_by, resolved_at, created_at
       FROM direct_hire_corrections
       WHERE application_id = $1 AND resolved_at IS NULL
       ORDER BY created_at ASC`
  
  const corrections = await db.query(query, [id])
  return NextResponse.json({ success: true, data: corrections.rows })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await AuthService.validateSession(request.cookies.get('bb_auth_token')?.value || '')
    if (!session || (session.role !== 'staff' && session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const items: CorrectionItem[] = body.items || []
    const note: string | undefined = body.note || ''

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one correction item is required' }, { status: 400 })
    }

    const application = await getApplicationWithUser(id)
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const uniqueFields = Array.from(new Set(items.map(i => (i.field_key || '').trim()).filter(Boolean)))
    if (uniqueFields.length === 0) {
      return NextResponse.json({ success: false, error: 'Field keys are required' }, { status: 400 })
    }

    // Check for existing corrections and handle re-flagging
    for (const item of items) {
      const fieldKey = item.field_key.trim()
      if (!fieldKey) continue
      
      // Check if correction already exists for this field
      const existing = await db.query(
        `SELECT id, resolved_at FROM direct_hire_corrections
         WHERE application_id = $1 AND field_key = $2
         ORDER BY created_at DESC LIMIT 1`,
        [id, fieldKey]
      )
      
      if (existing.rows.length > 0) {
        // Update existing correction: unresolve if resolved, update message
        await db.query(
          `UPDATE direct_hire_corrections
           SET message = $1, resolved_at = NULL, created_by = $2
           WHERE id = $3`,
          [item.message, session.id, existing.rows[0].id]
        )
      } else {
        // Insert new correction
        await db.query(
          `INSERT INTO direct_hire_corrections (application_id, field_key, message, created_by)
           VALUES ($1, $2, $3, $4)`,
          [id, fieldKey, item.message, session.id]
        )
      }
    }

    // Merge with existing correction_fields to preserve other flagged fields
    const existingFields = Array.isArray(application.correction_fields) 
      ? application.correction_fields 
      : []
    const mergedFields = Array.from(new Set([...existingFields, ...uniqueFields]))
    
    // Update application flags
    await db.query(
      `UPDATE direct_hire_applications
       SET needs_correction = true,
           correction_fields = $1,
           correction_note = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(mergedFields), note || null, id]
    )

    // Notify applicant (in-app) with detailed information
    if (application.applicant_user_id) {
      const controlNumber = application.control_number || ''
      const issuesList = items.map(i => `• ${getFieldLabel(i.field_key)}: ${i.message}`).join('\n')
      const notificationMessage = controlNumber 
        ? `Your Direct Hire application (Control Number: ${controlNumber}) has been returned for correction.\n\nIssues that need correction:\n${issuesList}\n\nPlease review the noted issues and resubmit your application once corrected.`
        : `Your Direct Hire application has been returned for correction.\n\nIssues that need correction:\n${issuesList}\n\nPlease review the noted issues and resubmit your application once corrected.`
      
      await NotificationService.createNotification(
        application.applicant_user_id,
        'status_change',
        'Application Sent Back for Correction',
        notificationMessage,
        'direct_hire',
        id
      )
    }

    // Email applicant if possible
    const recipientEmail = application.applicant_email || application.email || null
    if (recipientEmail) {
      const controlNumber = application.control_number || ''
      // Format issues list with user-friendly field labels
      const issuesList = items.map(i => `• ${getFieldLabel(i.field_key)}: ${i.message}`).join('\n')
      
      // Create formatted email message
      const textMessage = [
        'Dear Applicant,',
        '',
        controlNumber 
          ? `Your Direct Hire application (Control Number: ${controlNumber}) has been returned for correction.`
          : 'Your Direct Hire application has been returned for correction.',
        '',
        'Issues that need correction:',
        '',
        issuesList,
        '',
        'Please review the noted issues and resubmit your application once corrected.',
        '',
        'Thank you.'
      ].join('\n')
      
      await EmailService.sendNotificationEmail(
        recipientEmail,
        'Return of Direct Hire Application for Correction',
        textMessage
      )
    }

    // Audit log for transaction history
    await recordAuditLog(request, {
      action: 'correction_requested',
      tableName: 'direct_hire_applications',
      recordId: id,
      oldValues: { needs_correction: application.needs_correction, correction_fields: application.correction_fields },
      newValues: { needs_correction: true, correction_fields: uniqueFields, correction_note: note || null }
    })

    return NextResponse.json({ success: true, message: 'Corrections created' })
  } catch (error) {
    console.error('Error creating corrections:', error)
    return NextResponse.json({ success: false, error: 'Failed to create corrections' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await AuthService.validateSession(request.cookies.get('bb_auth_token')?.value || '')
    if (!session || (session.role !== 'staff' && session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { field_key, resolved } = body

    if (!field_key || typeof resolved !== 'boolean') {
      return NextResponse.json({ success: false, error: 'field_key and resolved are required' }, { status: 400 })
    }

    const application = await getApplicationWithUser(id)
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (resolved) {
      // Mark correction as resolved
      await db.query(
        `UPDATE direct_hire_corrections
         SET resolved_at = NOW()
         WHERE application_id = $1 AND field_key = $2 AND resolved_at IS NULL`,
        [id, field_key]
      )

      // Check if all corrections are resolved
      const unresolvedCount = await db.query(
        `SELECT COUNT(*) as count FROM direct_hire_corrections
         WHERE application_id = $1 AND resolved_at IS NULL`,
        [id]
      )

      // If all corrections are resolved, clear the needs_correction flag
      if (unresolvedCount.rows[0].count === '0') {
        await db.query(
          `UPDATE direct_hire_applications
           SET needs_correction = false, correction_fields = '[]'::jsonb, updated_at = NOW()
           WHERE id = $1`,
          [id]
        )
      }

      // Audit log
      await recordAuditLog(request, {
        action: 'correction_resolved',
        tableName: 'direct_hire_corrections',
        recordId: id,
        oldValues: { field_key, resolved_at: null },
        newValues: { field_key, resolved_at: new Date().toISOString() }
      })
    } else {
      // Unresolve correction
      await db.query(
        `UPDATE direct_hire_corrections
         SET resolved_at = NULL
         WHERE application_id = $1 AND field_key = $2`,
        [id, field_key]
      )

      // Set needs_correction back to true
      await db.query(
        `UPDATE direct_hire_applications
         SET needs_correction = true, updated_at = NOW()
         WHERE id = $1`,
        [id]
      )

      // Audit log
      await recordAuditLog(request, {
        action: 'correction_unresolved',
        tableName: 'direct_hire_corrections',
        recordId: id,
        oldValues: { field_key, resolved_at: 'resolved' },
        newValues: { field_key, resolved_at: null }
      })
    }

    return NextResponse.json({ success: true, message: resolved ? 'Correction marked as resolved' : 'Correction marked as unresolved' })
  } catch (error) {
    console.error('Error updating correction:', error)
    return NextResponse.json({ success: false, error: 'Failed to update correction' }, { status: 500 })
  }
}

