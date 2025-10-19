// app/api/direct-hire/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

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

    // Get current application to access existing status_checklist
    const existingApp = await db.query(
      'SELECT status_checklist FROM direct_hire_applications WHERE id = $1',
      [id]
    )

    if (existingApp.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    // Get current status_checklist or create default one
    const currentChecklist = existingApp.rows[0].status_checklist || {
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
      'UPDATE direct_hire_applications SET status_checklist = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status_checklist',
      [JSON.stringify(updatedChecklist), id]
    )

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
