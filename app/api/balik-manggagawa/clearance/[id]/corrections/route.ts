// app/api/balik-manggagawa/clearance/[id]/corrections/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService, StaffNotificationService } from '@/lib/services/notification-service'
import { recordAuditLog } from '@/lib/server/audit-logger'

type CorrectionItem = { field_key: string; message: string }

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

async function getClearanceWithApplicant(id: string) {
  const result = await db.query(
    `SELECT bmc.*, u.email AS applicant_email
     FROM balik_manggagawa_clearance bmc
     LEFT JOIN users u ON u.id = bmc.applicant_user_id
     WHERE bmc.id = $1`,
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
    ? `SELECT id, clearance_id, field_key, message, created_by, resolved_at, created_at
       FROM bm_corrections
       WHERE clearance_id = $1
       ORDER BY created_at ASC`
    : `SELECT id, clearance_id, field_key, message, created_by, resolved_at, created_at
       FROM bm_corrections
       WHERE clearance_id = $1 AND resolved_at IS NULL
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

    const clearance = await getClearanceWithApplicant(id)
    if (!clearance) {
      return NextResponse.json({ success: false, error: 'Clearance not found' }, { status: 404 })
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
        `SELECT id, resolved_at FROM bm_corrections
         WHERE clearance_id = $1 AND field_key = $2
         ORDER BY created_at DESC LIMIT 1`,
        [id, fieldKey]
      )

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE bm_corrections
           SET message = $1, resolved_at = NULL, created_by = $2
           WHERE id = $3`,
          [item.message, session.id, existing.rows[0].id]
        )
      } else {
        await db.query(
          `INSERT INTO bm_corrections (clearance_id, field_key, message, created_by)
           VALUES ($1, $2, $3, $4)`,
          [id, fieldKey, item.message, session.id]
        )
      }
    }

    // Merge correction fields
    const existingFields = Array.isArray(clearance.correction_fields)
      ? clearance.correction_fields
      : (() => {
          try { return JSON.parse(clearance.correction_fields || '[]') } catch { return [] }
        })()
    const mergedFields = Array.from(new Set([...existingFields, ...uniqueFields]))

    // Update flags on clearance
    await db.query(
      `UPDATE balik_manggagawa_clearance
       SET needs_correction = TRUE,
           correction_fields = $1,
           correction_note = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(mergedFields), note || null, id]
    )

    // Notify applicant (in-app)
    if (clearance.applicant_user_id) {
      const issuesList = items.map(i => `• ${getFieldLabel(i.field_key)}: ${i.message}`).join('\n')
      const notificationMessage =
        `Your Balik Manggagawa application has been returned for correction.\n\n` +
        `Issues that need correction:\n${issuesList}\n\n` +
        `Please review and resubmit once corrected.`

      await NotificationService.createNotification(
        clearance.applicant_user_id,
        'status_change',
        'Application sent back for correction',
        notificationMessage,
        'balik_manggagawa',
        id
      )
    }

    return NextResponse.json({ success: true, message: 'Corrections created' })
  } catch (error) {
    console.error('Error creating BM corrections:', error)
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

    const clearance = await getClearanceWithApplicant(id)
    if (!clearance) {
      return NextResponse.json({ success: false, error: 'Clearance not found' }, { status: 404 })
    }

    if (resolved) {
      await db.query(
        `UPDATE bm_corrections
         SET resolved_at = NOW()
         WHERE clearance_id = $1 AND field_key = $2 AND resolved_at IS NULL`,
        [id, field_key]
      )

      const unresolvedCount = await db.query(
        `SELECT COUNT(*) as count FROM bm_corrections
         WHERE clearance_id = $1 AND resolved_at IS NULL`,
        [id]
      )

      if (unresolvedCount.rows[0].count === '0') {
        await db.query(
          `UPDATE balik_manggagawa_clearance
           SET needs_correction = FALSE, correction_fields = '[]'::jsonb, updated_at = NOW()
           WHERE id = $1`,
          [id]
        )
      }

      await recordAuditLog(request, {
        action: 'bm_correction_resolved',
        tableName: 'bm_corrections',
        recordId: id,
        oldValues: { field_key, resolved_at: null },
        newValues: { field_key, resolved_at: new Date().toISOString() }
      })
    } else {
      await db.query(
        `UPDATE bm_corrections
         SET resolved_at = NULL
         WHERE clearance_id = $1 AND field_key = $2`,
        [id, field_key]
      )

      await db.query(
        `UPDATE balik_manggagawa_clearance
         SET needs_correction = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [id]
      )

      await recordAuditLog(request, {
        action: 'bm_correction_unresolved',
        tableName: 'bm_corrections',
        recordId: id,
        oldValues: { field_key, resolved_at: 'resolved' },
        newValues: { field_key, resolved_at: null }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating BM correction:', error)
    return NextResponse.json({ success: false, error: 'Failed to update correction' }, { status: 500 })
  }
}

