// app/api/system-reports/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'
import { checkAdmin } from '@/lib/check-admin'
import { generateSystemReportCertificate } from '@/lib/services/system-report-generator'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin access
    const { isAdmin: userIsAdmin, user } = await checkAdmin(request)
    if (!userIsAdmin || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { month, year } = body

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

    // If a certificate for this month/year already exists, serve it instead of regenerating
    const existing = await DatabaseService.getSystemReportCertificateByMonthYear(monthNum, yearNum)
    if (existing) {
      const existingBuffer = await (await fetch(`${request.nextUrl.origin}/api/system-reports/certificates/${existing.id}`)).arrayBuffer()
      return new NextResponse(Buffer.from(existingBuffer), {
        headers: {
          'Content-Type': existing.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${existing.file_name}"`
        }
      })
    }

    const result = await generateSystemReportCertificate({ month: monthNum, year: yearNum, createdBy: user.id })
    // Return as blob for download by fetching the saved file
    const fileBuffer = await (await fetch(`${request.nextUrl.origin}/api/system-reports/certificates/${result.certificate.id}`)).arrayBuffer()
    return new NextResponse(Buffer.from(fileBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${result.fileName}"`
      }
    })
  } catch (error) {
    console.error('Generate system report error:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

