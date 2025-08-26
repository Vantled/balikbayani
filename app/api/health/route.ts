// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { AuthService } from '@/lib/services/auth-service'

export async function GET() {
  const start = Date.now()
  try {
    // Quick DB probe
    await db.query('SELECT 1')

    // Optional quick stat: count of expired sessions (cheap)
    const expired = await db.query('SELECT COUNT(1) AS c FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP')

    const ms = Date.now() - start
    return NextResponse.json({
      ok: true,
      db: 'ok',
      latencyMs: ms,
      expiredSessions: Number(expired.rows[0]?.c || 0)
    })
  } catch (err: any) {
    const ms = Date.now() - start
    return NextResponse.json({ ok: false, error: err?.message || 'health_error', latencyMs: ms }, { status: 500 })
  }
}


