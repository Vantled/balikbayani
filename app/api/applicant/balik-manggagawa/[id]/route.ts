// app/api/applicant/balik-manggagawa/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { DatabaseService } from '@/lib/services/database-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params
    const token = request.cookies.get('bb_auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clearance = await DatabaseService.getBalikManggagawaClearanceById(id)
    
    if (!clearance) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (clearance.applicant_user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: clearance,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch application',
    }, { status: 500 })
  }
}
