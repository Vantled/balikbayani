// app/api/applicant/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { NotificationService } from '@/lib/services/notification-service'

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const count = await NotificationService.markAllAsRead(user.id)

    return NextResponse.json({
      success: true,
      data: { count },
      message: `${count} notification(s) marked as read`,
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to mark notifications as read',
    }, { status: 500 })
  }
}



