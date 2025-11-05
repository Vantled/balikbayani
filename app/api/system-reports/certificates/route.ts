// app/api/system-reports/certificates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'
import { initSystemReportsScheduler } from '@/lib/schedulers/system-reports-scheduler'
import { checkAdmin } from '@/lib/check-admin'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Initialize lightweight scheduler (idempotent)
    initSystemReportsScheduler()
    // Check admin access
    const { isAdmin: userIsAdmin } = await checkAdmin(request)
    if (!userIsAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch all certificates (client-side filtering and pagination)
    const certificates = await DatabaseService.getSystemReportCertificates({ page: 1, limit: 10000 })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: certificates
    })
  } catch (error) {
    console.error('Get system report certificates error:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

