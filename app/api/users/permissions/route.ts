// app/api/users/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse, PermissionUpdateRequest } from '@/lib/types';

function getUserFromRequest(request: NextRequest) {
  const userCookie = request.cookies.get('bb_user');
  if (!userCookie?.value) return null;
  try {
    return JSON.parse(userCookie.value);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const users = await DatabaseService.getUsersWithPermissions(user.role);
    const availablePermissions = DatabaseService.getAvailablePermissions();

    return NextResponse.json({
      success: true,
      data: {
        users,
        availablePermissions
      }
    });
  } catch (error) {
    console.error('Error fetching users with permissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body: PermissionUpdateRequest = await request.json();
    const { user_id, permissions, current_password } = body;

    if (!user_id || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ success: false, error: 'Invalid request data' }, { status: 400 });
    }

    // Validate current password is provided
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

    // Validate permission keys
    const availablePermissions = DatabaseService.getAvailablePermissions();
    const invalidPermissions = permissions.filter(p => !availablePermissions.includes(p.permission_key));
    if (invalidPermissions.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid permission keys: ${invalidPermissions.map(p => p.permission_key).join(', ')}` 
      }, { status: 400 });
    }

    await DatabaseService.updateUserPermissions(user_id, permissions, user.id);

    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully'
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ success: false, error: 'Failed to update permissions' }, { status: 500 });
  }
}
