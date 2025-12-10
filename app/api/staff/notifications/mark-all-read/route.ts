// app/api/staff/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { StaffNotificationService } from '@/lib/services/notification-service'

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await StaffNotificationService.markAllStaffNotificationsAsRead(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking all staff notifications as read:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to mark all notifications as read',
    }, { status: 500 })
  }
}

