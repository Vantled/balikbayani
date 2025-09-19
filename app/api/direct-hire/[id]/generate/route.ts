// app/api/direct-hire/[id]/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Document generation has been removed per user request
  return NextResponse.json<ApiResponse>({ 
    success: false, 
    error: 'Document generation has been disabled for this endpoint' 
  }, { status: 410 })
}