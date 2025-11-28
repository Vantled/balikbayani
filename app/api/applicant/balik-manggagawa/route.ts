// app/api/applicant/balik-manggagawa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import AuthService from '@/lib/services/auth-service'
import { db } from '@/lib/database'
import { DatabaseService } from '@/lib/services/database-service'
import { convertToUSD } from '@/lib/currency-converter'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow one BM application per applicant
    const existing = await db.query(
      'SELECT id FROM balik_manggagawa_clearance WHERE applicant_user_id = $1 LIMIT 1',
      [user.id]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'You already have a Balik Manggagawa application on file. Please track its status instead.',
      }, { status: 409 })
    }

    const body = await request.json()
    const {
      nameOfWorker,
      sex,
      employer,
      destination,
      position,
      jobType,
      salaryAmount,
      salaryCurrency = 'USD',
    } = body || {}

    if (!nameOfWorker || !sex || !employer || !destination || !salaryAmount) {
      return NextResponse.json({
        success: false,
        error: 'Please complete all required fields before submitting.',
      }, { status: 400 })
    }

    if (!['male', 'female'].includes(String(sex).toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: 'Sex must be either male or female.',
      }, { status: 400 })
    }

    const salaryValue = Number(salaryAmount)
    if (Number.isNaN(salaryValue) || salaryValue <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Salary must be a positive number.',
      }, { status: 400 })
    }

    const normalizedCurrency = String(salaryCurrency || 'USD').toUpperCase()
    // Convert salary to USD (matching create-application-modal.tsx logic)
    let salaryUSD = normalizedCurrency === 'USD'
      ? salaryValue
      : convertToUSD(salaryValue, normalizedCurrency)
    // Round to nearest hundredths (matching create-application-modal.tsx)
    salaryUSD = Math.round((salaryUSD + Number.EPSILON) * 100) / 100

    const clearance = await DatabaseService.createBalikManggagawaClearance({
      nameOfWorker: String(nameOfWorker).toUpperCase(),
      sex: sex === 'female' ? 'female' : 'male',
      employer: String(employer).toUpperCase(),
      destination: String(destination).toUpperCase(),
      salary: salaryUSD,
      rawSalary: salaryValue,
      salaryCurrency: normalizedCurrency,
      jobType: jobType || null,
      position: position ? String(position).toUpperCase() : null,
      evaluator: 'APPLICANT PORTAL',
      time_received: new Date().toISOString(),
      time_released: null,
      applicantUserId: user.id,
    })

    const response: ApiResponse = {
      success: true,
      data: {
        id: clearance.id,
        controlNumber: clearance.control_number,
        status: clearance.status,
        createdAt: clearance.created_at,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Applicant BM submission error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to submit Balik Manggagawa application',
    }, { status: 500 })
  }
}

