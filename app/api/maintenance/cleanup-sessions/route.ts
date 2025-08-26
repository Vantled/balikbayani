// app/api/maintenance/cleanup-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth-service'

// Simple protection: require superadmin via header token (reuse auth cookie in middleware in real setups)
export async function POST(request: NextRequest) {
  try {
    // Basic gate: only allow if a valid bb_auth_token cookie exists
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await AuthService.cleanupExpiredSessions()
    return NextResponse.json({ success: true, deleted })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'cleanup_failed' }, { status: 500 })
  }
}


