// app/api/gov-to-gov/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'

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

    // Check if application exists
    const appCheck = await db.query(
      'SELECT id FROM gov_to_gov_applications WHERE id = $1',
      [id]
    )
    
    if (appCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    // Mark as viewed (using INSERT ... ON CONFLICT to handle duplicates)
    await db.query(
      `INSERT INTO application_views (application_id, application_type, viewed_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (application_id, application_type, viewed_by) 
       DO UPDATE SET viewed_at = CURRENT_TIMESTAMP`,
      [id, 'gov_to_gov', session.id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking application as viewed:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark as viewed' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await AuthService.validateSession(request.cookies.get('bb_auth_token')?.value || '')
    
    if (!session || (session.role !== 'staff' && session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if this staff member has viewed this application
    const viewCheck = await db.query(
      `SELECT viewed_at FROM application_views
       WHERE application_id = $1 AND application_type = $2 AND viewed_by = $3`,
      [id, 'gov_to_gov', session.id]
    )

    return NextResponse.json({
      success: true,
      data: {
        viewed: viewCheck.rows.length > 0,
        viewed_at: viewCheck.rows[0]?.viewed_at || null
      }
    })
  } catch (error) {
    console.error('Error checking application view status:', error)
    return NextResponse.json({ success: false, error: 'Failed to check view status' }, { status: 500 })
  }
}

