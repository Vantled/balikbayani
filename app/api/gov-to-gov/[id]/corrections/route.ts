// app/api/gov-to-gov/[id]/corrections/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService, StaffNotificationService } from '@/lib/services/notification-service'
import { recordAuditLog } from '@/lib/server/audit-logger'

type CorrectionItem = { field_key: string; message: string }

// Map field keys to user-friendly labels
function getFieldLabel(fieldKey: string): string {
  const map: Record<string, string> = {
    last_name: 'Last Name',
    first_name: 'First Name',
    middle_name: 'Middle Name',
    sex: 'Sex',
    date_of_birth: 'Date of Birth',
    age: 'Age',
    height: 'Height',
    weight: 'Weight',
    educational_attainment: 'Educational Attainment',
    present_address: 'Present Address',
    email_address: 'Email Address',
    contact_number: 'Contact Number',
    passport_number: 'Passport Number',
    passport_validity: 'Passport Validity',
    id_presented: 'ID Presented',
    id_number: 'ID Number',
    with_taiwan_work_experience: 'Taiwan Work Experience',
    taiwan_company: 'Taiwan Company',
    taiwan_year_started: 'Taiwan Year Started',
    taiwan_year_ended: 'Taiwan Year Ended',
    with_job_experience: 'Job Experience',
    other_company: 'Other Company',
    other_year_started: 'Other Year Started',
    other_year_ended: 'Other Year Ended',
  }
  return map[fieldKey] || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function getApplicationWithApplicant(id: string) {
  const result = await db.query(
    `SELECT gtg.*, u.email AS applicant_email
     FROM gov_to_gov_applications gtg
     LEFT JOIN users u ON u.id = gtg.applicant_user_id
     WHERE gtg.id = $1`,
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
       FROM gov_to_gov_corrections
       WHERE application_id = $1
       ORDER BY created_at ASC`
    : `SELECT id, application_id, field_key, message, created_by, resolved_at, created_at
       FROM gov_to_gov_corrections
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

    const application = await getApplicationWithApplicant(id)
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const uniqueFields = Array.from(new Set(items.map(i => (i.field_key || '').trim()).filter(Boolean)))
    if (uniqueFields.length === 0) {
      return NextResponse.json({ success: false, error: 'Field keys are required' }, { status: 400 })
    }

    // Insert or update corrections per field
    for (const item of items) {
      const fieldKey = item.field_key.trim()
      if (!fieldKey) continue

      const existing = await db.query(
        `SELECT id, resolved_at FROM gov_to_gov_corrections
         WHERE application_id = $1 AND field_key = $2
         ORDER BY created_at DESC LIMIT 1`,
        [id, fieldKey]
      )

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE gov_to_gov_corrections
           SET message = $1, resolved_at = NULL, created_by = $2
           WHERE id = $3`,
          [item.message, session.id, existing.rows[0].id]
        )
      } else {
        await db.query(
          `INSERT INTO gov_to_gov_corrections (application_id, field_key, message, created_by)
           VALUES ($1, $2, $3, $4)`,
          [id, fieldKey, item.message, session.id]
        )
      }
    }

    // Merge correction fields
    const existingFields = Array.isArray(application.correction_fields)
      ? application.correction_fields
      : (() => {
          try { return JSON.parse(application.correction_fields || '[]') } catch { return [] }
        })()
    const mergedFields = Array.from(new Set([...existingFields, ...uniqueFields]))

    // Update flags on application
    await db.query(
      `UPDATE gov_to_gov_applications
       SET needs_correction = TRUE,
           correction_fields = $1,
           correction_note = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(mergedFields), note || null, id]
    )

    // Notify applicant (in-app)
    if (application.applicant_user_id) {
      const controlNumber = application.control_number || ''
      const issuesList = items.map(i => `• ${getFieldLabel(i.field_key)}: ${i.message}`).join('\n')
      const notificationMessage = controlNumber
        ? `Your Gov-to-Gov application (Control Number: ${controlNumber}) has been returned for correction.\n\nIssues that need correction:\n${issuesList}\n\nPlease review the noted issues and resubmit your application once corrected.`
        : `Your Gov-to-Gov application has been returned for correction.\n\nIssues that need correction:\n${issuesList}\n\nPlease review the noted issues and resubmit your application once corrected.`

      await NotificationService.createNotification(
        application.applicant_user_id,
        'status_change',
        'Application sent back for correction',
        notificationMessage,
        'gov_to_gov',
        id
      )
    }

    return NextResponse.json({ success: true, message: 'Corrections created' })
  } catch (error) {
    console.error('Error creating Gov-to-Gov corrections:', error)
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

    const application = await getApplicationWithApplicant(id)
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (resolved) {
      await db.query(
        `UPDATE gov_to_gov_corrections
         SET resolved_at = NOW()
         WHERE application_id = $1 AND field_key = $2 AND resolved_at IS NULL`,
        [id, field_key]
      )

      const unresolvedCount = await db.query(
        `SELECT COUNT(*) as count FROM gov_to_gov_corrections
         WHERE application_id = $1 AND resolved_at IS NULL`,
        [id]
      )

      if (unresolvedCount.rows[0].count === '0') {
        await db.query(
          `UPDATE gov_to_gov_applications
           SET needs_correction = FALSE, correction_fields = '[]'::jsonb, updated_at = NOW()
           WHERE id = $1`,
          [id]
        )
      }

      await recordAuditLog(request, {
        action: 'gov_to_gov_correction_resolved',
        tableName: 'gov_to_gov_corrections',
        recordId: id,
        oldValues: { field_key, resolved_at: null },
        newValues: { field_key, resolved_at: new Date().toISOString() }
      })
    } else {
      await db.query(
        `UPDATE gov_to_gov_corrections
         SET resolved_at = NULL
         WHERE application_id = $1 AND field_key = $2`,
        [id, field_key]
      )

      await db.query(
        `UPDATE gov_to_gov_applications
         SET needs_correction = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [id]
      )

      await recordAuditLog(request, {
        action: 'gov_to_gov_correction_unresolved',
        tableName: 'gov_to_gov_corrections',
        recordId: id,
        oldValues: { field_key, resolved_at: 'resolved' },
        newValues: { field_key, resolved_at: null }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating Gov-to-Gov correction:', error)
    return NextResponse.json({ success: false, error: 'Failed to update correction' }, { status: 500 })
  }
}

