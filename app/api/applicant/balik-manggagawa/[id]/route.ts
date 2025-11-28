// app/api/applicant/balik-manggagawa/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import AuthService from '@/lib/services/auth-service'
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
      'SELECT * FROM balik_manggagawa_clearance WHERE id = $1 LIMIT 1',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const clearance = result.rows[0]
    if (clearance.applicant_user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: clearance,
    })
  } catch (error) {
    console.error('Applicant BM fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Balik Manggagawa application',
    }, { status: 500 })
  }
}

