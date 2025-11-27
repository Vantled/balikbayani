// app/api/auth/forgot-password/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { OtpService } from '@/lib/services/otp-service'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json()
    const email = body?.email?.trim()
    const code = body?.code?.trim()

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid email address.'
      }, { status: 400 })
    }

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter the 6-digit verification code.'
      }, { status: 400 })
    }

    const result = await OtpService.verifyOtp(email, code)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Unable to verify the code.',
        data: result.remainingAttempts !== undefined
          ? { remainingAttempts: result.remainingAttempts }
          : undefined
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { verificationToken: result.verificationToken }
    })
  } catch (error) {
    console.error('Verify password reset OTP error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

