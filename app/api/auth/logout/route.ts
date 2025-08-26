// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { token } = body;

    if (token) {
      // Invalidate the session token (don't await to make it faster)
      AuthService.invalidateSession(token).catch((error) => {
        console.error('Background session invalidation error:', error);
      });
    }

    const res = NextResponse.json({
      success: true,
      message: 'Logout successful'
    });
    // Clear cookies
    res.cookies.set('bb_auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    res.cookies.set('bb_user', '', { httpOnly: false, path: '/', maxAge: 0 });
    return res;

  } catch (error) {
    console.error('Logout error:', error);
    const res = NextResponse.json({
      success: true, // Always return success for logout
      message: 'Logout successful'
    });
    res.cookies.set('bb_auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    res.cookies.set('bb_user', '', { httpOnly: false, path: '/', maxAge: 0 });
    return res;
  }
}
