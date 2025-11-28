// app/api/applicant/gov-to-gov/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await db.query(
      'SELECT * FROM gov_to_gov_applications WHERE id = $1 LIMIT 1',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const application = result.rows[0]
    if (application.applicant_user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: application,
    })
  } catch (error) {
    console.error('Applicant gov-to-gov fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Gov-to-Gov application',
    }, { status: 500 })
  }
}

