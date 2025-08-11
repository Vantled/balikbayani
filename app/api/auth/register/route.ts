// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { username, email, password, full_name } = body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required'
      }, { status: 400 });
    }

    // Use AuthService for secure user registration
    const registerResult = await AuthService.registerUser({
      username,
      email,
      password,
      full_name
    });

    if (!registerResult.success) {
      return NextResponse.json({
        success: false,
        error: registerResult.error || 'Registration failed'
      }, { status: 400 });
    }

    // Remove sensitive data from response
    const { password_hash, ...userWithoutPassword } = registerResult.user!;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: 'Registration successful. Please wait for admin approval.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
