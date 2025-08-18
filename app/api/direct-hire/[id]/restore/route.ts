// app/api/direct-hire/[id]/restore/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Attempt restore directly; this works even if the record is currently soft-deleted
    const restored = await DatabaseService.restoreDirectHireApplication(id)
    if (!restored) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Application not found or not deleted' }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({ success: true, message: 'Application restored' })
  } catch (error) {
    console.error('Error restoring application:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to restore application' }, { status: 500 })
  }
}
