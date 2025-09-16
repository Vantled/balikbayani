// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';
import { isSuperadmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 });
    }

    // Check if user is superadmin
    if (!isSuperadmin(user)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    const body = await request.json();
    const { role, current_password } = body;

    // Validation
    if (!role) {
      return NextResponse.json({
        success: false,
        error: 'Role is required'
      }, { status: 400 });
    }

    if (!['superadmin', 'admin', 'staff'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role'
      }, { status: 400 });
    }

    if (!current_password) {
      return NextResponse.json({
        success: false,
        error: 'Current password is required'
      }, { status: 400 });
    }

    // Verify current password
    const passwordValid = await AuthService.verifyUserPassword(user.id, current_password);
    if (!passwordValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid current password'
      }, { status: 400 });
    }

    // Update user role
    const result = await AuthService.updateUserRole(params.id, role, user.id);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 });
    }

    // Check if user is superadmin
    if (!isSuperadmin(user)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Delete user
    const result = await AuthService.deleteUser(params.id, user.id);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
