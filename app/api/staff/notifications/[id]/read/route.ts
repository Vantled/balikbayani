// app/api/staff/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { StaffNotificationService } from '@/lib/services/notification-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const success = await StaffNotificationService.markStaffNotificationAsRead(id, user.id)

    if (!success) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking staff notification as read:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to mark notification as read',
    }, { status: 500 })
  }
}

