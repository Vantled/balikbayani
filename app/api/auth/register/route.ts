// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';
import { OtpService } from '@/lib/services/otp-service';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-z0-9._-]{4,30}$/i;

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { username, email, password, full_name, first_name, middle_name, last_name, verification_token } = body;

    // Support both old format (full_name) and new format (first_name, middle_name, last_name)
    const firstName = first_name?.trim() || '';
    const middleName = middle_name?.trim() || '';
    const lastName = last_name?.trim() || '';
    const fullNameFromParts = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const trimmedFullName = full_name?.trim() || fullNameFromParts;

    if (!username || !email || !password || !verification_token) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required.'
      }, { status: 400 });
    }

    if (!trimmedFullName && (!firstName || !lastName)) {
      return NextResponse.json({
        success: false,
        error: 'Name is required.'
      }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid email address.'
      }, { status: 400 });
    }

    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json({
        success: false,
        error: 'Username must be 4-30 characters and can include letters, numbers, dots, underscores, or hyphens.'
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      }, { status: 400 });
    }

    if (trimmedFullName.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Full name must be at least 3 characters long.'
      }, { status: 400 });
    }

    const tokenValidation = await OtpService.consumeVerificationToken(
      normalizedEmail,
      verification_token
    );

    if (!tokenValidation.success) {
      return NextResponse.json({
        success: false,
        error: tokenValidation.error || 'Invalid verification token.'
      }, { status: 400 });
    }

    const registerResult = await AuthService.registerUser({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      full_name: trimmedFullName,
      first_name: firstName || null,
      middle_name: middleName || null,
      last_name: lastName || null
    });

    if (!registerResult.success) {
      return NextResponse.json({
        success: false,
        error: registerResult.error || 'Registration failed'
      }, { status: 400 });
    }

    const { password_hash, ...userWithoutPassword } = registerResult.user!;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: 'Registration successful! You can now sign in.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
