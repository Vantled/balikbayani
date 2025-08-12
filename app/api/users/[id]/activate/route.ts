// app/api/users/[id]/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    // Get session token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Validate session and get user
    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 });
    }

    // Check if user is superadmin
    if (user.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Activate user
    const result = await AuthService.activateUser(params.id, user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'User activated successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to activate user'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Activate user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
