// app/api/gov-to-gov/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data } = await DatabaseService.getGovToGovApplications({}, { page: 1, limit: 1 })
    const found = (data as any[]).find((r: any) => r.id === id)
    if (!found) return NextResponse.json({ success: false, error: 'Not found' } as ApiResponse, { status: 404 })
    return NextResponse.json({ success: true, data: found } as ApiResponse)
  } catch (error) {
    console.error('Error fetching gov-to-gov application:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' } as ApiResponse, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Only update fields that are provided in the request body
    const updatePayload: any = {}
    
    if (body.last_name !== undefined) updatePayload.last_name = (body.last_name || '').toUpperCase()
    if (body.first_name !== undefined) updatePayload.first_name = (body.first_name || '').toUpperCase()
    if (body.middle_name !== undefined) updatePayload.middle_name = (body.middle_name || '').toUpperCase()
    if (body.sex !== undefined) updatePayload.sex = (String(body.sex || '').toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female'
    if (body.date_of_birth !== undefined) {
      updatePayload.date_of_birth = body.date_of_birth ? new Date(body.date_of_birth) : null
      updatePayload.age = body.date_of_birth ? Math.floor((new Date().getTime() - new Date(body.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0
    }
    if (body.height !== undefined) updatePayload.height = body.height ? Number(body.height) : null
    if (body.weight !== undefined) updatePayload.weight = body.weight ? Number(body.weight) : null
    if (body.educational_attainment !== undefined) updatePayload.educational_attainment = (body.educational_attainment || '').toUpperCase()
    if (body.present_address !== undefined) updatePayload.present_address = (body.present_address || '').toUpperCase()
    if (body.email_address !== undefined) updatePayload.email_address = body.email_address || ''
    if (body.contact_number !== undefined) updatePayload.contact_number = body.contact_number || ''
    if (body.passport_number !== undefined) updatePayload.passport_number = (body.passport_number || '').toUpperCase()
    if (body.passport_validity !== undefined) updatePayload.passport_validity = body.passport_validity ? new Date(body.passport_validity) : null
    if (body.id_presented !== undefined) updatePayload.id_presented = (body.id_presented || '').toUpperCase()
    if (body.id_number !== undefined) updatePayload.id_number = (body.id_number || '').toUpperCase()
    if (body.with_taiwan_work_experience !== undefined) updatePayload.with_taiwan_work_experience = body.with_taiwan_work_experience === true
    if (body.with_job_experience !== undefined) updatePayload.with_job_experience = body.with_job_experience === true
    if (body.taiwan_company !== undefined) updatePayload.taiwan_company = (body.taiwan_company || '').toUpperCase() || null
    if (body.taiwan_year_started !== undefined) updatePayload.taiwan_year_started = body.taiwan_year_started ? Number(body.taiwan_year_started) : null
    if (body.taiwan_year_ended !== undefined) updatePayload.taiwan_year_ended = body.taiwan_year_ended ? Number(body.taiwan_year_ended) : null
    if (body.other_company !== undefined) updatePayload.other_company = (body.other_company || '').toUpperCase() || null
    if (body.other_year_started !== undefined) updatePayload.other_year_started = body.other_year_started ? Number(body.other_year_started) : null
    if (body.other_year_ended !== undefined) updatePayload.other_year_ended = body.other_year_ended ? Number(body.other_year_ended) : null
    if (body.date_received_by_region !== undefined) updatePayload.date_received_by_region = body.date_received_by_region ? new Date(body.date_received_by_region) : null
    if (body.date_card_released !== undefined) updatePayload.date_card_released = body.date_card_released ? new Date(body.date_card_released) : null
    if (body.remarks !== undefined) updatePayload.remarks = (body.remarks || '').toUpperCase() || null

    const updated = await DatabaseService.updateGovToGovApplication(id, updatePayload)
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Not found' } as ApiResponse, { status: 404 })
    }
    return NextResponse.json({ success: true, data: updated } as ApiResponse)
  } catch (error) {
    console.error('Error updating gov-to-gov application:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' } as ApiResponse, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deleted = await DatabaseService.softDeleteGovToGovApplication(id)
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Not found' } as ApiResponse, { status: 404 })
    }
    return NextResponse.json({ success: true, data: deleted, message: 'Application soft deleted' } as ApiResponse)
  } catch (error) {
    console.error('Error soft deleting gov-to-gov application:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' } as ApiResponse, { status: 500 })
  }
}


