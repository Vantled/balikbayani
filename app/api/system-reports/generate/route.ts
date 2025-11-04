// app/api/system-reports/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'
import { checkAdmin } from '@/lib/check-admin'
import { FileUploadService } from '@/lib/file-upload-service'
import createReport from 'docx-templates'
import { readFile } from 'fs/promises'
import { join } from 'path'

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

    // Get statistics
    const stats = await DatabaseService.getProcessedWorkersCount(monthNum, yearNum)

    // Load template
    const templatePath = join(process.cwd(), 'public', 'templates', 'Report', 'utilization.docx')
    const template = await readFile(templatePath)

    // Prepare month name
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    const monthName = monthNames[monthNum - 1]

    // Get current date for certificate issuance
    const now = new Date()
    const day = now.getDate()
    const currentMonthName = monthNames[now.getMonth()]
    const currentYear = now.getFullYear()

    // Format day with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinalSuffix = (day: number): string => {
      if (day > 3 && day < 21) return 'th'
      switch (day % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }
    const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`
    const issuedDate = `${dayWithOrdinal} day of ${currentMonthName}, ${currentYear}`

    // Prepare data for template
    const data = {
      month_and_year: `${monthName} ${yearNum}`,
      monthly_total: stats.monthly.toString(),
      quarterly_total: stats.quarterToDate.toString(),
      yearly_total: stats.yearToDate.toString(),
      issued_date: issuedDate,
      day: dayWithOrdinal,
      month_issued: currentMonthName,
      year_issued: currentYear.toString()
    }

    // Generate report
    const report = await createReport({
      template,
      data,
      cmdDelimiter: ['{{', '}}']
    })

    // Save file to filesystem
    const fileName = `Certificate_of_Utilization_${monthName}_${yearNum}.docx`
    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      fileName,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'system-reports', // applicationId for system reports
      'certificates' // documentType
    )

    // Save certificate record to database
    const certificate = await DatabaseService.createSystemReportCertificate({
      month: monthNum,
      year: yearNum,
      file_name: fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType,
      created_by: user.id
    })

    // Return as blob for download
    return new NextResponse(Buffer.from(report), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
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

