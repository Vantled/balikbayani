// lib/services/system-report-generator.ts
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import createReport from 'docx-templates'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function generateSystemReportCertificate(params: {
  month: number
  year: number
  createdBy: string | null
}): Promise<{ fileName: string; filePath: string; fileSize: number; mimeType: string; certificate: any }> {
  const { month, year, createdBy } = params

  if (!month || !year) throw new Error('Month and year are required')
  if (month < 1 || month > 12) throw new Error('Invalid month')
  if (year < 2020 || year > 2100) throw new Error('Invalid year')

  const stats = await DatabaseService.getProcessedWorkersCount(month, year)

  const templatePath = join(process.cwd(), 'public', 'templates', 'Report', 'utilization.docx')
  const template = await readFile(templatePath)

  const monthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ]
  const monthName = monthNames[month - 1]

  const now = new Date()
  const day = now.getDate()
  const currentMonthName = monthNames[now.getMonth()]
  const currentYear = now.getFullYear()

  const getOrdinalSuffix = (d: number): string => {
    if (d > 3 && d < 21) return 'th'
    switch (d % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th' }
  }
  const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`

  const data = {
    month_and_year: `${monthName} ${year}`,
    monthly_total: stats.monthly.toString(),
    quarterly_total: stats.quarterToDate.toString(),
    yearly_total: stats.yearToDate.toString(),
    issued_date: `${dayWithOrdinal} day of ${currentMonthName}, ${currentYear}`,
    day: dayWithOrdinal,
    month_issued: currentMonthName,
    year_issued: currentYear.toString()
  }

  const report = await createReport({ template, data, cmdDelimiter: ['{{', '}}'] })

  const fileName = `Certificate_of_Utilization_${monthName}_${year}.docx`
  const upload = await FileUploadService.uploadBuffer(
    Buffer.from(report),
    fileName,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'system-reports',
    'certificates'
  )

  const certificate = await DatabaseService.createSystemReportCertificate({
    month,
    year,
    file_name: fileName,
    file_path: upload.filePath,
    file_size: upload.fileSize,
    mime_type: upload.mimeType,
    created_by: createdBy
  })

  return {
    fileName,
    filePath: upload.filePath,
    fileSize: upload.fileSize,
    mimeType: upload.mimeType,
    certificate
  }
}


