// app/api/gov-to-gov/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'
import { recordAuditLog } from '@/lib/server/audit-logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || undefined
    const sex = (searchParams.get('sex') as any) || undefined
    const educational_attainment = searchParams.get('educational_attainment') || undefined
    const with_taiwan_work_experience = searchParams.get('with_taiwan_work_experience') === 'true' ? true : searchParams.get('with_taiwan_work_experience') === 'false' ? false : undefined
    const date_from = searchParams.get('date_from') || undefined
    const date_to = searchParams.get('date_to') || undefined
    const include_deleted = searchParams.get('include_deleted') === 'true' ? true : searchParams.get('include_deleted') === 'false' ? false : undefined
    const include_active = searchParams.get('include_active') === 'false' ? false : undefined

    const data = await DatabaseService.getGovToGovApplications({ 
      search, 
      sex, 
      educational_attainment,
      with_taiwan_work_experience,
      date_from,
      date_to,
      include_deleted,
      include_active
    }, { page, limit })
    const response: ApiResponse = { success: true, data }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching gov-to-gov applications:', error)
    const response: ApiResponse = { success: false, error: 'Failed to fetch gov-to-gov applications' }
    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Coerce and sanitize incoming fields
    const payload = {
      last_name: (body.last_name || '').toUpperCase(),
      first_name: (body.first_name || '').toUpperCase(),
      middle_name: (body.middle_name || '').toUpperCase(),
      sex: (String(body.sex || '').toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female',
      date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
      age: body.date_of_birth ? Math.floor((new Date().getTime() - new Date(body.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
      height: body.height ? Number(body.height) : null,
      weight: body.weight ? Number(body.weight) : null,
      educational_attainment: (body.educational_attainment || '').toUpperCase(),
      present_address: (body.present_address || '').toUpperCase(),
      email_address: body.email_address || '',
      contact_number: body.contact_number || '',
      passport_number: (body.passport_number || '').toUpperCase(),
      passport_validity: body.passport_validity ? new Date(body.passport_validity) : null,
      id_presented: (body.id_presented || '').toUpperCase(),
      id_number: (body.id_number || '').toUpperCase(),
      with_taiwan_work_experience: body.with_taiwan_work_experience === true,
      with_job_experience: body.with_job_experience === true,
      taiwan_company: (body.taiwan_company || '').toUpperCase() || null,
      taiwan_year_started: body.taiwan_year_started ? Number(body.taiwan_year_started) : null,
      taiwan_year_ended: body.taiwan_year_ended ? Number(body.taiwan_year_ended) : null,
      other_company: (body.other_company || '').toUpperCase() || null,
      other_year_started: body.other_year_started ? Number(body.other_year_started) : null,
      other_year_ended: body.other_year_ended ? Number(body.other_year_ended) : null,
      remarks: (body.remarks || '').toUpperCase() || null,
      time_received: body.time_received || null,
      time_released: body.time_released || null,
    } as any

    const created = await DatabaseService.createGovToGovApplication(payload)
    
    await recordAuditLog(request, {
      action: 'create',
      tableName: 'gov_to_gov_applications',
      recordId: created.id,
      newValues: {
        control_number: created.control_number,
      },
    });
    
    const response: ApiResponse = { success: true, data: created }
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating gov-to-gov application:', error)
    const response: ApiResponse = { success: false, error: 'Failed to create gov-to-gov application' }
    return NextResponse.json(response, { status: 500 })
  }
}


