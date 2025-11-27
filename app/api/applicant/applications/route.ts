// app/api/applicant/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check for existing Direct Hire application
    const directHireResult = await db.query(
      'SELECT id, control_number, status, created_at FROM direct_hire_applications WHERE applicant_user_id = $1 LIMIT 1',
      [user.id]
    )

    const hasDirectHire = directHireResult.rows.length > 0
    const directHireApp = hasDirectHire ? directHireResult.rows[0] : null

    // Check for existing Balik Manggagawa application
    const bmResult = await db.query(
      `SELECT id, control_number, status, created_at 
       FROM balik_manggagawa_clearance 
       WHERE applicant_user_id = $1 
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    )

    const hasBalikManggagawa = bmResult.rows.length > 0
    const balikManggagawaApp = hasBalikManggagawa ? bmResult.rows[0] : null

    // TODO: Add other application types (Gov-to-Gov, Information Sheet) when they support applicant_user_id

    return NextResponse.json({
      success: true,
      data: {
        hasDirectHire,
        directHire: directHireApp ? {
          id: directHireApp.id,
          controlNumber: directHireApp.control_number,
          status: directHireApp.status,
          createdAt: directHireApp.created_at,
        } : null,
        hasBalikManggagawa,
        balikManggagawa: balikManggagawaApp ? {
          id: balikManggagawaApp.id,
          controlNumber: balikManggagawaApp.control_number,
          status: balikManggagawaApp.status,
          createdAt: balikManggagawaApp.created_at,
        } : null,
        // Future: hasGovToGov, govToGov, hasInformationSheet, informationSheet
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch applications',
    }, { status: 500 })
  }
}

