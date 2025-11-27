// app/api/auth/forgot-password/reset/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import { OtpService } from '@/lib/services/otp-service'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json()
    const email = body?.email?.trim()
    const verificationToken = body?.verificationToken?.trim()
    const newPassword = body?.newPassword?.trim()

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a valid email address.'
      }, { status: 400 })
    }

    if (!verificationToken) {
      return NextResponse.json({
        success: false,
        error: 'Verification token is required.'
      }, { status: 400 })
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      }, { status: 400 })
    }

    // Verify the token is valid and consumed
    const consumeResult = await OtpService.consumeVerificationToken(email, verificationToken)
    if (!consumeResult.success) {
      return NextResponse.json({
        success: false,
        error: consumeResult.error || 'Invalid or expired verification token. Please start over.'
      }, { status: 400 })
    }

    // Get user by email
    const user = await AuthService.getUserByEmail(email)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User account not found.'
      }, { status: 404 })
    }

    // Ensure user is an applicant
    if (user.role !== 'applicant') {
      return NextResponse.json({
        success: false,
        error: 'Password reset is only available for applicant accounts.'
      }, { status: 403 })
    }

    // Hash the new password
    const hashedPassword = await AuthService.hashPassword(newPassword)

    // Update user password
    const updateResult = await AuthService.updateUserProfile(user.id, {
      password_hash: hashedPassword,
      password_changed_at: new Date().toISOString()
    })

    if (!updateResult.success) {
      return NextResponse.json({
        success: false,
        error: updateResult.error || 'Failed to reset password. Please try again.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

