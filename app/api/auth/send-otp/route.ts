// app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { OtpService } from '@/lib/services/otp-service';
import { AuthService } from '@/lib/services/auth-service';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const email = body?.email?.trim();

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid email address.'
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await AuthService.getUserByEmail(normalizedEmail);

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.'
      }, { status: 400 });
    }

    const otpResult = await OtpService.requestOtp(normalizedEmail);

    if (!otpResult.success) {
      const status = otpResult.retryAfterSeconds ? 429 : 400;
      const headers: Record<string, string> = {};
      if (otpResult.retryAfterSeconds) {
        headers['Retry-After'] = otpResult.retryAfterSeconds.toString();
      }

      return NextResponse.json({
        success: false,
        error: otpResult.error || 'Unable to send verification code at this time.',
        data: otpResult.retryAfterSeconds
          ? { retryAfterSeconds: otpResult.retryAfterSeconds }
          : undefined
      }, { status, headers });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent. Please check your email.'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

