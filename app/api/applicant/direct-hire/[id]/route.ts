// app/api/applicant/direct-hire/[id]/route.ts
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

    // Get application and verify it belongs to this applicant
    const application = await DatabaseService.getDirectHireApplicationById(id)
    
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    // Verify the application belongs to this applicant
    if (application.applicant_user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: application,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch application',
    }, { status: 500 })
  }
}

