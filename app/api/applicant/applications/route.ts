// app/api/applicant/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

const formatGovToGovReference = (id: string, createdAt: string) => {
  const date = new Date(createdAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const monthDay = `${month}${day}`

  const hash = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const monthly = String((hash % 1000) || 1).padStart(3, '0')
  const yearly = String((Math.floor(hash / 1000) % 1000) || 1).padStart(3, '0')

  // Match DH/BM style but with GG prefix and double dash: GG--YYYY-MMDD-XXX-YYY
  return `GG--${year}-${monthDay}-${monthly}-${yearly}`
}

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
      'SELECT id, control_number, status, created_at FROM direct_hire_applications WHERE applicant_user_id = $1 AND deleted_at IS NULL LIMIT 1',
      [user.id]
    )

    const hasDirectHire = directHireResult.rows.length > 0
    const directHireApp = hasDirectHire ? directHireResult.rows[0] : null

    // Check for existing Balik Manggagawa application
    const bmResult = await db.query(
      `SELECT id, control_number, status, created_at 
       FROM balik_manggagawa_clearance 
       WHERE applicant_user_id = $1 
         AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    )

    const hasBalikManggagawa = bmResult.rows.length > 0
    const balikManggagawaApp = hasBalikManggagawa ? bmResult.rows[0] : null

    // Check for existing Gov-to-Gov application
    const govToGovResult = await db.query(
      `SELECT id, created_at 
       FROM gov_to_gov_applications
       WHERE applicant_user_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    )

    const hasGovToGov = govToGovResult.rows.length > 0
    const govToGovApp = hasGovToGov ? govToGovResult.rows[0] : null

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
        hasGovToGov,
        govToGov: govToGovApp ? {
          id: govToGovApp.id,
          controlNumber: formatGovToGovReference(govToGovApp.id, govToGovApp.created_at),
          createdAt: govToGovApp.created_at,
        } : null,
        // Future: hasInformationSheet, informationSheet
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch applications',
    }, { status: 500 })
  }
}

