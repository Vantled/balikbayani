// app/api/balik-manggagawa/clearance/[id]/corrections/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService, StaffNotificationService } from '@/lib/services/notification-service'

async function getClearance(id: string) {
  const result = await db.query(
    `SELECT id, applicant_user_id, needs_correction, correction_fields, correction_note,
            name_of_worker, sex, destination, position, job_type, employer, raw_salary, salary_currency
     FROM balik_manggagawa_clearance
     WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

// Map field keys to user-friendly labels
function getFieldLabel(fieldKey: string): string {
  const map: Record<string, string> = {
    name_of_worker: 'Name of Worker',
    sex: 'Sex',
    destination: 'Destination',
    position: 'Position',
    job_type: 'Job Type',
    employer: 'Employer',
    salary: 'Salary',
    raw_salary: 'Salary',
    salary_currency: 'Salary Currency',
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

    const clearance = await getClearance(id)
    if (!clearance) {
      return NextResponse.json({ success: false, error: 'Clearance not found' }, { status: 404 })
    }
    if (clearance.applicant_user_id !== session.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!clearance.needs_correction) {
      return NextResponse.json({ success: false, error: 'No active corrections' }, { status: 400 })
    }

    const allowedFields: string[] = Array.isArray(clearance.correction_fields) ? clearance.correction_fields : []
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
        sets.push(`${key === 'salary' ? 'raw_salary' : key} = $${idx++}`)
        values.push(payload[key])
      }
      values.push(id)
      await db.query(
        `UPDATE balik_manggagawa_clearance SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      )
    }

    // Clear needs_correction so staff can review
    await db.query(
      `UPDATE balik_manggagawa_clearance
       SET needs_correction = FALSE,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // Notify staff who flagged (most recent flaggers per field)
    const correctionsResult = await db.query(
      `SELECT DISTINCT ON (field_key) field_key, created_by, message, created_at
       FROM bm_corrections
       WHERE clearance_id = $1 
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
      `SELECT control_number, name_of_worker FROM balik_manggagawa_clearance WHERE id = $1`,
      [id]
    )
    const controlNumber = appDetails.rows[0]?.control_number || ''
    const applicantName = appDetails.rows[0]?.name_of_worker || 'Applicant'

    for (const [staffId, fieldKeys] of staffNotifications.entries()) {
      const fieldLabels = fieldKeys.map(key => getFieldLabel(key))
      const fieldsList = fieldLabels.length === 1
        ? fieldLabels[0]
        : fieldLabels.slice(0, -1).join(', ') + ' and ' + fieldLabels[fieldLabels.length - 1]

      const notificationMessage = controlNumber
        ? `Applicant ${applicantName} has resubmitted corrections for the following field(s) in Balik Manggagawa clearance (Control Number: ${controlNumber}): ${fieldsList}. Please review the corrections.`
        : `Applicant ${applicantName} has resubmitted corrections for the following field(s) in Balik Manggagawa clearance: ${fieldsList}. Please review the corrections.`

      try {
        await StaffNotificationService.createStaffNotification(
          staffId,
          'correction_resubmitted',
          'Correction Resubmitted by Applicant',
          notificationMessage,
          'balik_manggagawa',
          id,
          fieldKeys.length === 1 ? fieldKeys[0] : null
        )
      } catch (error) {
        console.error(`Error notifying staff ${staffId}:`, error)
      }
    }

    // Notify applicant of successful submission
    if (clearance.applicant_user_id) {
      await NotificationService.createNotification(
        clearance.applicant_user_id,
        'status_change',
        'Corrections submitted',
        'Your corrections have been submitted for review.',
        'balik_manggagawa',
        id
      )
    }

    return NextResponse.json({ success: true, message: 'Corrections submitted' })
  } catch (error) {
    console.error('Error resolving BM corrections:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit corrections' }, { status: 500 })
  }
}

