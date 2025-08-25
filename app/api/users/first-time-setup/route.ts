// app/api/users/first-time-setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { AuthService } from '@/lib/services/auth-service'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookies
    const token = request.cookies.get('bb_auth_token')?.value
    console.log('First-time setup API: Token found:', !!token)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate session and get user
    const session = await AuthService.validateSession(token)
    console.log('First-time setup API: Session valid:', !!session)
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Get current user from database
    const currentUser = await AuthService.getUserById(session.id)
    console.log('First-time setup API: User found:', !!currentUser, 'User ID:', currentUser?.id)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { username, email, new_password } = body

    // Validate required fields
    if (!username || !email || !new_password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate username length
    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password length
    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if username is already taken (excluding current user)
    const existingUser = await DatabaseService.getUserByUsername(username)
    if (existingUser && existingUser.id !== currentUser.id) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Check if email is already taken (excluding current user)
    const existingEmail = await DatabaseService.getUserByEmail(email)
    if (existingEmail && existingEmail.id !== currentUser.id) {
      return NextResponse.json(
        { error: 'Email is already taken' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, 12)

    // Update the user with new information
    const result = await AuthService.updateUserProfile(currentUser.id, {
      username,
      email,
      password_hash: hashedPassword,
      password_changed_at: new Date().toISOString()
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update user' },
        { status: 500 }
      )
    }

    // Mark as no longer first login
    await DatabaseService.updateUser(currentUser.id, {
      is_first_login: false
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User account configured successfully'
    })

  } catch (error) {
    console.error('Error in first-time setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
