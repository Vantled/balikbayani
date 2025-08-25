// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';
import { isSuperadmin } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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

    // Get all users
    const result = await AuthService.getAllUsers();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { users: result.users },
      message: 'Users retrieved successfully'
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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
    const { username, email, password, full_name, role, is_first_login } = body;

    // Validation
    if (!username || !password || !full_name || !role) {
      return NextResponse.json({
        success: false,
        error: 'Username, password, full name, and role are required'
      }, { status: 400 });
    }

    // Email is optional for temporary users (will be set during first-time setup)
    if (email && email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid email address'
      }, { status: 400 });
    }

    if (!['admin', 'staff'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role'
      }, { status: 400 });
    }

    // Create user
    const result = await AuthService.createUser({
      username,
      email,
      password,
      full_name,
      role,
      createdBy: user.id,
      is_first_login: is_first_login || false
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    // Remove sensitive data from response
    const { password_hash, ...userWithoutPassword } = result.user!;

    return NextResponse.json({
      success: true,
      data: { user: userWithoutPassword },
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
