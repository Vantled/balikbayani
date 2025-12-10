// app/api/staff/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { StaffNotificationService } from '@/lib/services/notification-service'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || (user.role !== 'staff' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { notifications, total } = await StaffNotificationService.getStaffNotifications(
      user.id,
      limit,
      offset
    )

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        total,
      },
    })
  } catch (error) {
    console.error('Error fetching staff notifications:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications',
    }, { status: 500 })
  }
}

