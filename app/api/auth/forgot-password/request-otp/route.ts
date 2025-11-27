// app/api/auth/forgot-password/request-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { OtpService } from '@/lib/services/otp-service'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json()
    const identifier = body?.identifier?.trim() // Can be email or username

    if (!identifier) {
      return NextResponse.json({
        success: false,
        error: 'Please enter your email address or username.'
      }, { status: 400 })
    }

    // Try to find user by email or username
    let user = null
    if (emailRegex.test(identifier)) {
      user = await AuthService.getUserByEmail(identifier)
    } else {
      user = await AuthService.getUserByUsername(identifier)
    }

    // Check if user exists and is an applicant
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an applicant account exists with that email or username, a verification code has been sent.'
      })
    }

    if (user.role !== 'applicant') {
      // Don't reveal that the account exists but is not an applicant
      return NextResponse.json({
        success: true,
        message: 'If an applicant account exists with that email or username, a verification code has been sent.'
      })
    }

    if (!user.email) {
      return NextResponse.json({
        success: false,
        error: 'This account does not have an email address associated with it. Please contact support.'
      }, { status: 400 })
    }

    // Request OTP to the user's email
    const otpResult = await OtpService.requestOtp(user.email)

    if (!otpResult.success) {
      return NextResponse.json({
        success: false,
        error: otpResult.error || 'Failed to send verification code. Please try again.',
        data: otpResult.retryAfterSeconds ? { retryAfterSeconds: otpResult.retryAfterSeconds } : undefined
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'A verification code has been sent to your email address.',
      data: {
        email: user.email, // Return email for the next step
        retryAfterSeconds: otpResult.retryAfterSeconds
      }
    })
  } catch (error) {
    console.error('Request password reset OTP error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

