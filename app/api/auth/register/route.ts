// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';
import { OtpService } from '@/lib/services/otp-service';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-z0-9._-]{4,30}$/i;

const splitFullName = (fullName: string) => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return { first: '', middle: '', last: '' }
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' }
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] }

  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts.slice(-1).join(' '),
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { username, email, password, full_name, first_name, middle_name, last_name, verification_token } = body;

    // Normalize and ensure we always store separated name parts
    const parsedFromFull = full_name ? splitFullName(full_name) : { first: '', middle: '', last: '' }
    const firstName = (first_name?.trim() || parsedFromFull.first || '').toUpperCase();
    const middleName = (middle_name?.trim() || parsedFromFull.middle || '').toUpperCase();
    const lastName = (last_name?.trim() || parsedFromFull.last || '').toUpperCase();
    const normalizedFullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    if (!username || !email || !password || !verification_token) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required.'
      }, { status: 400 });
    }

    if (!firstName || !lastName) {
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

    if (normalizedFullName.length < 3) {
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
      full_name: normalizedFullName,
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
