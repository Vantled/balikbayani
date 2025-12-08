// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';
import { isSuperadmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Allow changing applicant to staff/admin/superadmin, but not changing other roles to applicant
    // Also allow changing between staff/admin/superadmin
    if (!['superadmin', 'admin', 'staff'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role. Only staff, admin, and superadmin roles can be assigned through user management.'
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

    const { id } = await params;
    // Update user role
    const result = await AuthService.updateUserRole(id, role, user.id);

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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    // Delete user
    const result = await AuthService.deleteUser(id, user.id);

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
