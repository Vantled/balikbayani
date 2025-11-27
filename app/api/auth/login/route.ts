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
        error: 'Username/email and password are required'
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

    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: loginResult.token
      },
      message: 'Login successful'
    });

    // Determine if cookies should be secure (HTTPS only)
    // Check if request is over HTTPS, or if explicitly enabled via env var
    const url = new URL(request.url);
    const isHttps = url.protocol === 'https:';
    const forceSecureCookies = process.env.FORCE_SECURE_COOKIES === 'true';
    const useSecureCookies = isHttps || forceSecureCookies;

    // Set HttpOnly session cookie for token
    const ONE_DAY = 60 * 60 * 24;
    const cookieOptions = {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ONE_DAY,
    };
    
    console.log('Login: Setting cookies with options:', {
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      protocol: url.protocol,
      host: url.host,
    });
    
    response.cookies.set('bb_auth_token', loginResult.token!, cookieOptions);
    // Set readable user cookie for UI (non-HttpOnly)
    response.cookies.set('bb_user', JSON.stringify(userWithoutPassword), {
      httpOnly: false,
      secure: useSecureCookies,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ONE_DAY,
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
