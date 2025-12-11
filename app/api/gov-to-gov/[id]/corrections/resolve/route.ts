// app/api/gov-to-gov/[id]/corrections/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService, StaffNotificationService } from '@/lib/services/notification-service'

async function getApplication(id: string) {
  const result = await db.query(
    `SELECT id, applicant_user_id, needs_correction, correction_fields, correction_note,
            last_name, first_name, middle_name, sex, date_of_birth, age, height, weight,
            educational_attainment, present_address, email_address, contact_number,
            passport_number, passport_validity, id_presented, id_number,
            with_taiwan_work_experience, taiwan_company, taiwan_year_started, taiwan_year_ended,
            with_job_experience, other_company, other_year_started, other_year_ended
     FROM gov_to_gov_applications
     WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

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
    const contentType = request.headers.get('content-type') || ''
    let payload: Record<string, any> = {}

    if (contentType.includes('application/json')) {
      const body = await request.json()
      payload = body.payload || {}
    } else {
      // support form submissions
      const formData = await request.formData()
      formData.forEach((value, key) => {
        payload[key] = typeof value === 'string' ? value : value.toString()
      })
    }

    const submittedFields = Object.keys(payload)
    const invalid = submittedFields.filter(key => !allowedFields.includes(key))
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: `You may only update: ${allowedFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Apply updates
    if (submittedFields.length > 0) {
      const sets: string[] = []
      const values: any[] = []
      let idx = 1
      for (const key of submittedFields) {
        // Handle date fields
        if (key === 'date_of_birth' || key === 'passport_validity') {
          sets.push(`${key} = $${idx++}::date`)
          values.push(payload[key])
        } else if (key === 'age' || key === 'height' || key === 'weight' || 
                   key === 'taiwan_year_started' || key === 'taiwan_year_ended' ||
                   key === 'other_year_started' || key === 'other_year_ended') {
          sets.push(`${key} = $${idx++}::integer`)
          values.push(payload[key] ? parseInt(payload[key]) : null)
        } else if (key === 'with_taiwan_work_experience' || key === 'with_job_experience') {
          sets.push(`${key} = $${idx++}::boolean`)
          values.push(payload[key] === 'true' || payload[key] === true)
        } else {
          sets.push(`${key} = $${idx++}`)
          values.push(payload[key])
        }
      }
      values.push(id)
      await db.query(
        `UPDATE gov_to_gov_applications SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      )
    }

    // Clear needs_correction so staff can review
    await db.query(
      `UPDATE gov_to_gov_applications
       SET needs_correction = FALSE,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // Notify staff who flagged (most recent flaggers per field)
    const correctionsResult = await db.query(
      `SELECT DISTINCT ON (field_key) field_key, created_by, message, created_at
       FROM gov_to_gov_corrections
       WHERE application_id = $1 
         AND field_key = ANY($2::text[])
       ORDER BY field_key, created_at DESC`,
      [id, allowedFields]
    )

    const staffNotifications = new Map<string, string[]>()
    for (const correction of correctionsResult.rows) {
      if (correction.created_by) {
        const staffId = correction.created_by
        if (!staffNotifications.has(staffId)) staffNotifications.set(staffId, [])
        const fields = staffNotifications.get(staffId)!
        if (!fields.includes(correction.field_key)) fields.push(correction.field_key)
      }
    }

    // Get application details for notification
    const appDetails = await db.query(
      `SELECT first_name, last_name, middle_name FROM gov_to_gov_applications WHERE id = $1`,
      [id]
    )
    const applicantName = appDetails.rows[0] 
      ? [appDetails.rows[0].first_name, appDetails.rows[0].middle_name, appDetails.rows[0].last_name].filter(Boolean).join(' ') || 'Applicant'
      : 'Applicant'

    for (const [staffId, fieldKeys] of staffNotifications.entries()) {
      const fieldLabels = fieldKeys.map(key => getFieldLabel(key))
      const fieldsList = fieldLabels.length === 1
        ? fieldLabels[0]
        : fieldLabels.slice(0, -1).join(', ') + ' and ' + fieldLabels[fieldLabels.length - 1]

      const notificationMessage = `Applicant ${applicantName} has resubmitted corrections for the following field(s) in Gov-to-Gov application: ${fieldsList}. Please review the corrections.`

      try {
        await StaffNotificationService.createStaffNotification(
          staffId,
          'correction_resubmitted',
          'Correction Resubmitted by Applicant',
          notificationMessage,
          'gov_to_gov',
          id,
          fieldKeys.length === 1 ? fieldKeys[0] : null
        )
      } catch (error) {
        console.error(`Error notifying staff ${staffId}:`, error)
      }
    }

    // Notify applicant of successful submission
    if (application.applicant_user_id) {
      await NotificationService.createNotification(
        application.applicant_user_id,
        'status_change',
        'Corrections submitted',
        'Your corrections have been submitted for review.',
        'gov_to_gov',
        id
      )
    }

    return NextResponse.json({ success: true, message: 'Corrections submitted' })
  } catch (error) {
    console.error('Error resolving Gov-to-Gov corrections:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit corrections' }, { status: 500 })
  }
}

