// app/api/system-reports/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'
import { checkAdmin } from '@/lib/check-admin'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Check admin access
    const { isAdmin: userIsAdmin } = await checkAdmin(request)
    if (!userIsAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      )
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid month' },
        { status: 400 }
      )
    }

    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid year' },
        { status: 400 }
      )
    }

    const stats = await DatabaseService.getProcessedWorkersCount(monthNum, yearNum)

    // Get detailed breakdown for debugging
    const breakdown = await DatabaseService.getProcessedWorkersCountBreakdown(monthNum, yearNum)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...stats,
        breakdown // Include breakdown for debugging
      }
    })
  } catch (error) {
    console.error('Get system reports stats error:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

