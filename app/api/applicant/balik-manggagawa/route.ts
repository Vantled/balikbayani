// app/api/applicant/balik-manggagawa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import AuthService from '@/lib/services/auth-service'
import { db } from '@/lib/database'
import { DatabaseService } from '@/lib/services/database-service'
import { convertToUSD } from '@/lib/currency-converter'
import { NotificationService } from '@/lib/services/notification-service'

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
      'SELECT id FROM balik_manggagawa_clearance WHERE applicant_user_id = $1 AND deleted_at IS NULL LIMIT 1',
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
      name_of_worker,
      sex,
      employer,
      destination,
      position,
      job_type,
      salary,
      salary_currency = 'USD',
    } = body || {}

    if (!name_of_worker || !sex || !employer || !destination || !salary) {
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

    const salaryValue = Number(salary)
    if (Number.isNaN(salaryValue) || salaryValue <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Salary must be a positive number.',
      }, { status: 400 })
    }

    const normalizedCurrency = String(salary_currency || 'USD').toUpperCase()
    let salaryUSD = normalizedCurrency === 'USD'
      ? salaryValue
      : convertToUSD(salaryValue, normalizedCurrency)
    salaryUSD = Math.round((salaryUSD + Number.EPSILON) * 100) / 100

    const clearance = await DatabaseService.createBalikManggagawaClearance({
      nameOfWorker: String(name_of_worker).toUpperCase(),
      sex: sex === 'female' ? 'female' : 'male',
      employer: String(employer).toUpperCase(),
      destination: String(destination).toUpperCase(),
      salary: salaryUSD,
      rawSalary: salaryValue,
      salaryCurrency: normalizedCurrency,
      jobType: job_type || null,
      position: position ? String(position).toUpperCase() : null,
      evaluator: 'APPLICANT PORTAL',
      time_received: new Date().toISOString(),
      time_released: null,
      applicantUserId: user.id,
    })

    // Create submission notification for applicant
    try {
      await NotificationService.createNotification(
        user.id,
        'status_change',
        'Balik Manggagawa Application Submitted',
        `Your Balik Manggagawa application has been submitted. Control number: ${clearance.control_number}.`,
        'balik_manggagawa',
        clearance.id
      )
    } catch (error) {
      console.error('Error creating BM submission notification:', error)
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: clearance.id,
        controlNumber: clearance.control_number,
        status: clearance.status,
        createdAt: clearance.created_at,
      },
    }
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Applicant BM submission error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to submit Balik Manggagawa application',
    }, { status: 500 })
  }
}

