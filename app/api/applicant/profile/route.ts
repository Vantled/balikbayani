// app/api/applicant/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'
import { AuthService } from '@/lib/services/auth-service'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Return user data (without password hash)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_approved: user.is_approved,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }

    return NextResponse.json({
      success: true,
      data: { user: userData },
    })
  } catch (error) {
    console.error('Applicant profile fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile',
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user || user.role !== 'applicant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, username, current_password, new_password } = body

    // Validate required fields (full_name is read-only, so not required in request)
    if (!email?.trim() || !username?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email and username are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await AuthService.getUserByEmail(email)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Email address is already in use' },
          { status: 400 }
        )
      }
    }

    // Check if username is already taken by another user
    if (username !== user.username) {
      const existingUser = await AuthService.getUserByUsername(username)
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Username is already taken' },
          { status: 400 }
        )
      }
    }

    // Always validate current password for any profile changes
    if (!current_password) {
      return NextResponse.json(
        { success: false, error: 'Current password is required to confirm changes' },
        { status: 400 }
      )
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash || '')
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // If password change is requested, validate new password
    if (new_password) {
      // Validate new password
      if (new_password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long' },
          { status: 400 }
        )
      }
    }

    // Prepare update data (full_name is read-only, so not included in updates)
    const updateData: any = {
      email: email.trim(),
      username: username.trim(),
    }

    // Hash new password if provided
    if (new_password) {
      const saltRounds = 12
      updateData.password_hash = await bcrypt.hash(new_password, saltRounds)
      updateData.password_changed_at = new Date().toISOString()
    }

    // Update user in database
    const result = await AuthService.updateUserProfile(user.id, updateData)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Log the profile update
    await AuthService.logAuditEvent(
      user.id,
      'PROFILE_UPDATED',
      'users',
      user.id,
      {
        full_name: user.full_name,
        email: user.email,
        username: user.username,
      },
      {
        full_name: user.full_name, // Keep original full_name since it's read-only
        email: updateData.email,
        username: updateData.username,
        password_changed: !!new_password,
      }
    )

    if (!result.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    const updatedUser = {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      full_name: result.user.full_name,
      role: result.user.role,
      is_approved: result.user.is_approved,
      is_active: result.user.is_active,
      last_login: result.user.last_login,
      created_at: result.user.created_at,
      updated_at: result.user.updated_at,
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    })
  } catch (error) {
    console.error('Applicant profile update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

