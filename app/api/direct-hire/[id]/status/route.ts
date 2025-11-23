// app/api/direct-hire/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { DatabaseService } from '@/lib/services/database-service'
import { recordAuditLog } from '@/lib/server/audit-logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }

    // Get current application to access existing status_checklist and status
    const existingApplication = await DatabaseService.getDirectHireApplicationById(id)
    if (!existingApplication) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    // Get current status_checklist or create default one
    const currentChecklist = (existingApplication as any).status_checklist || {
      evaluated: { checked: true, timestamp: null },
      for_confirmation: { checked: false, timestamp: null },
      emailed_to_dhad: { checked: false, timestamp: null },
      received_from_dhad: { checked: false, timestamp: null },
      for_interview: { checked: false, timestamp: null }
    }

    // Update the specific status in the checklist
    const updatedChecklist = {
      ...currentChecklist,
      [status]: {
        checked: true,
        timestamp: new Date().toISOString()
      }
    }

    // Update application with new status_checklist
    const result = await db.query(
      'UPDATE direct_hire_applications SET status_checklist = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status_checklist, status',
      [JSON.stringify(updatedChecklist), id]
    )

    // Record audit log for status checklist update
    const oldStatusChecklist = currentChecklist[status]?.checked || false
    const newStatusChecklist = updatedChecklist[status]?.checked || false

    if (oldStatusChecklist !== newStatusChecklist) {
      await recordAuditLog(request, {
        action: 'update',
        tableName: 'direct_hire_applications',
        recordId: id,
        oldValues: {
          status_checklist: {
            [status]: { checked: oldStatusChecklist, timestamp: currentChecklist[status]?.timestamp || null }
          }
        },
        newValues: {
          status_checklist: {
            [status]: { checked: newStatusChecklist, timestamp: updatedChecklist[status]?.timestamp }
          }
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status_checklist: result.rows[0].status_checklist
      },
      message: 'Status updated successfully'
    })
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
