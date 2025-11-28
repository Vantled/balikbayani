// app/api/applicant/gov-to-gov/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { DatabaseService } from '@/lib/services/database-service'
import { db } from '@/lib/database'

const toUpper = (value: string | undefined | null) => (value || '').toString().trim().toUpperCase()

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isValidContactNumber = (value: string) => /^09\d{9}$/.test(value)

// Generate GG-style reference similar to DH/BM control numbers
const formatGovToGovReference = (id: string, createdAt: Date) => {
  const year = createdAt.getFullYear()
  const month = String(createdAt.getMonth() + 1).padStart(2, '0')
  const day = String(createdAt.getDate()).padStart(2, '0')
  const monthDay = `${month}${day}`

  // Derive pseudo monthly/yearly counters from id (deterministic but not sequential)
  const hash = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const monthly = String((hash % 1000) || 1).padStart(3, '0')
  const yearly = String((Math.floor(hash / 1000) % 1000) || 1).padStart(3, '0')

  // Match DH/BM style but with GG prefix and double dash: GG--YYYY-MMDD-XXX-YYY
  return `GG--${year}-${monthDay}-${monthly}-${yearly}`
}

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

    const body = await request.json()

    const requiredFields: Record<string, string> = {
      first_name: body.first_name,
      last_name: body.last_name,
      sex: body.sex,
      date_of_birth: body.date_of_birth,
      height: body.height,
      weight: body.weight,
      educational_attainment: body.educational_attainment,
      present_address: body.present_address,
      email_address: body.email_address,
      contact_number: body.contact_number,
      passport_number: body.passport_number,
      passport_validity: body.passport_validity,
      id_presented: body.id_presented,
      id_number: body.id_number,
    }

    for (const [field, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || String(value).trim() === '') {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field.replace(/_/g, ' ')}`,
        }, { status: 400 })
      }
    }

    if (!isValidEmail(String(body.email_address))) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
    }

    const normalizedContact = String(body.contact_number || '').replace(/\D/g, '')
    if (!isValidContactNumber(normalizedContact)) {
      return NextResponse.json({ success: false, error: 'Contact number must start with 09 and be 11 digits.' }, { status: 400 })
    }

    const birthDate = new Date(body.date_of_birth)
    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date of birth' }, { status: 400 })
    }

    const passportValidity = new Date(body.passport_validity)
    if (Number.isNaN(passportValidity.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid passport validity date' }, { status: 400 })
    }

    const heightValue = Number(body.height)
    const weightValue = Number(body.weight)

    if (!Number.isFinite(heightValue) || heightValue <= 0) {
      return NextResponse.json({ success: false, error: 'Height must be a positive number' }, { status: 400 })
    }

    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      return NextResponse.json({ success: false, error: 'Weight must be a positive number' }, { status: 400 })
    }

    const existing = await db.query(
      'SELECT id FROM gov_to_gov_applications WHERE applicant_user_id = $1 LIMIT 1',
      [user.id]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'You already have a Gov-to-Gov application on file. Please track its status instead.',
      }, { status: 409 })
    }

    const withTaiwanExperience = String(body.with_taiwan_work_experience || body.withTaiwanExperience || '').toLowerCase()
    const withJobExperience = String(body.with_job_experience || body.withOtherExperience || '').toLowerCase()

    const payload = {
      last_name: toUpper(body.last_name),
      first_name: toUpper(body.first_name),
      middle_name: toUpper(body.middle_name),
      sex: String(body.sex).toLowerCase() === 'female' ? 'female' : 'male',
      date_of_birth: birthDate,
      age: Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))),
      height: heightValue,
      weight: weightValue,
      educational_attainment: toUpper(body.educational_attainment),
      present_address: toUpper(body.present_address),
      email_address: String(body.email_address).trim(),
      contact_number: normalizedContact,
      passport_number: toUpper(body.passport_number),
      passport_validity: passportValidity,
      id_presented: toUpper(body.id_presented),
      id_number: toUpper(body.id_number),
      with_taiwan_work_experience: withTaiwanExperience === 'yes' || withTaiwanExperience === 'true',
      with_job_experience: withJobExperience === 'yes' || withJobExperience === 'true',
      taiwan_company: body.taiwan_company ? toUpper(body.taiwan_company) : null,
      taiwan_year_started: body.taiwan_year_started ? Number(body.taiwan_year_started) : null,
      taiwan_year_ended: body.taiwan_year_ended ? Number(body.taiwan_year_ended) : null,
      other_company: body.other_company ? toUpper(body.other_company) : null,
      other_year_started: body.other_year_started ? Number(body.other_year_started) : null,
      other_year_ended: body.other_year_ended ? Number(body.other_year_ended) : null,
      remarks: body.remarks ? toUpper(body.remarks) : null,
      time_received: new Date().toISOString(),
      time_released: null,
      applicant_user_id: user.id,
    }

    if (payload.with_taiwan_work_experience && (!payload.taiwan_company || !payload.taiwan_year_started || !payload.taiwan_year_ended)) {
      return NextResponse.json({
        success: false,
        error: 'Please complete your Taiwan work experience details.',
      }, { status: 400 })
    }

    if (payload.with_job_experience && (!payload.other_company || !payload.other_year_started || !payload.other_year_ended)) {
      return NextResponse.json({
        success: false,
        error: 'Please complete your other job experience details.',
      }, { status: 400 })
    }

    const created = await DatabaseService.createGovToGovApplication(payload as any)

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        controlNumber: formatGovToGovReference(created.id, created.created_at ? new Date(created.created_at) : new Date()),
      },
      message: 'Application submitted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Applicant Gov-to-Gov submission error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to submit application',
    }, { status: 500 })
  }
}

