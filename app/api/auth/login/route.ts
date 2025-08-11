// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 });
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use AuthService for secure authentication
    const loginResult = await AuthService.loginUser(username, password, ipAddress, userAgent);

    if (!loginResult.success) {
      return NextResponse.json({
        success: false,
        error: loginResult.error || 'Authentication failed'
      }, { status: 401 });
    }

    // Remove sensitive data from response
    const { password_hash, ...userWithoutPassword } = loginResult.user!;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: loginResult.token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
