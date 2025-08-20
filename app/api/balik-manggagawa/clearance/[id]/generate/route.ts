// app/api/balik-manggagawa/clearance/[id]/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'
import createReport from 'docx-templates'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ApiResponse } from '@/lib/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const clearance = await DatabaseService.getBalikManggagawaClearanceById(id)
    if (!clearance) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Clearance not found' }, { status: 404 })
    }

    // Debug: Log available fields
    console.log('Available clearance fields:', Object.keys(clearance))
    console.log('months_years:', (clearance as any).months_years)
    console.log('with_principal:', (clearance as any).with_principal)
    console.log('date_departure:', (clearance as any).date_departure)

    // Pick template per clearance type (see public/templates)
    const typeToTemplate: Record<string, string> = {
      watchlisted_employer: 'watchlisted employer.docx',
      seafarer_position: 'seafarer.docx',
      non_compliant_country: 'non-compliant-country.docx',
      no_verified_contract: 'no-verified-contract.docx',
      for_assessment_country: 'for-assessment-country.docx',
      critical_skill: 'critical-skills.docx',
      watchlisted_similar_name: 'watchlisted ofw.docx',
    }
    const tplName = typeToTemplate[clearance.clearance_type] || 'direct-hire-clearance.docx'
    const templatePath = join(process.cwd(), 'public', 'templates', tplName)
    const template = await readFile(templatePath)

    const createdRaw: any = (clearance as any).created_at
    let created = new Date()
    if (createdRaw) {
      const d = new Date(createdRaw)
      if (!isNaN(d.getTime())) created = d
    }
    const createdDateStr = created.toISOString().slice(0, 10)
    const createdDateLong = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      .format(created)
      .toUpperCase()

    // Optional per-type date fields (if present in record)
    const dateArrivalRaw: any = (clearance as any).date_arrival
    const dateDepartureRaw: any = (clearance as any).date_departure
    const dateOfDepartureRaw: any = (clearance as any).date_of_departure
    const employmentStartDateRaw: any = (clearance as any).employment_start_date
    const processingDateRaw: any = (clearance as any).processing_date
    
    // Debug: Log the raw date values
    console.log('date_departure raw:', dateDepartureRaw)
    console.log('date_of_departure raw:', dateOfDepartureRaw)
    console.log('date_arrival raw:', dateArrivalRaw)
    const fmtLong = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(d).toUpperCase()
    const norm = (raw: any) => {
      const d = raw ? new Date(raw) : null
      if (d && !isNaN(d.getTime())) return { iso: d.toISOString().slice(0,10), long: fmtLong(d) }
      return { iso: '', long: '' }
    }
    const arrival = norm(dateArrivalRaw)
    const departure = norm(dateDepartureRaw)
    const dateOfDeparture = norm(dateOfDepartureRaw)
    const employmentStart = norm(employmentStartDateRaw)
    const processing = norm(processingDateRaw)

    // Prefer no_of_months_years if available (used by some types), fallback to months_years
    const monthsYearsValue = (clearance as any).no_of_months_years || (clearance as any).months_years || ''

    const report = await createReport({
      template,
      data: {
        control_number: clearance.control_number,
        control_no: clearance.control_number, // Add alias for control_no
        // Provide multiple aliases to match template tags
        name: clearance.name_of_worker,
        name_of_worker: clearance.name_of_worker,
        sex: clearance.sex,
        employer: clearance.employer,
        jobsite: clearance.destination, // map as jobsite-equivalent
        destination: clearance.destination,
        position: (clearance as any).position || '',
        salary: String(clearance.salary ?? ''),
        salary_currency: 'USD',
        evaluator: '',
        created_date: createdDateStr,
        created_date_long: createdDateLong,
        date: createdDateStr,
        DATE: createdDateStr,
        DATE_LONG: createdDateLong,
        date_arrival: arrival.iso,
        // Prefer date_of_departure if present, fallback to date_departure
        date_departure: dateOfDeparture.iso || departure.iso,
        date_arrival_long: arrival.long,
        date_departure_long: dateOfDeparture.long || departure.long,
        // Add more aliases for common template patterns
        departure_date: departure.iso,
        departure_date_long: departure.long,
        arrival_date: arrival.iso,
        arrival_date_long: arrival.long,
        // Add more comprehensive date mappings
        date_of_departure: departure.iso,
        date_of_departure_long: dateOfDeparture.long || departure.long, // Use new field if available
        date_of_arrival: arrival.iso,
        date_of_arrival_long: arrival.long,
        months_years: monthsYearsValue,
        months_years_long: monthsYearsValue, // Add alias
        months_years_text: monthsYearsValue, // Add another alias
        with_principal: (clearance as any).with_principal || '',
        with_principal_long: (clearance as any).with_principal || '', // Add alias
        with_principal_text: (clearance as any).with_principal || '', // Add another alias
        // Add more comprehensive mappings for template fields
        no_of_months_years: (clearance as any).no_of_months_years || '',
        no_of_months_years_long: (clearance as any).no_of_months_years || '',
        new_principal_name: (clearance as any).new_principal_name || '',
        employment_duration: (clearance as any).employment_duration || '',
        place_date_employment: (clearance as any).place_date_employment || '',
        date_blacklisting: (clearance as any).date_blacklisting || '',
        total_deployed_ofws: (clearance as any).total_deployed_ofws || '',
        reason_blacklisting: (clearance as any).reason_blacklisting || '',
        years_with_principal: (clearance as any).years_with_principal || '',
        employment_start_date: employmentStart.iso,
        employment_start_date_long: employmentStart.long,
        processing_date: processing.iso,
        processing_date_long: processing.long,
        remarks: (clearance as any).remarks || '',
        clearance_type: clearance.clearance_type
      },
      cmdDelimiter: ['{{', '}}']
    })

    // Map type to desired document name
    const typeToDocName: Record<string, string> = {
      critical_skill: 'Critical Skills CLEARANCE REQUEST',
      for_assessment_country: 'For assessment countries CLEARANCE REQUEST',
      no_verified_contract: 'NO VERIFIED CONTRACT CLEARANCE REQUEST',
      non_compliant_country: 'NON COMPLIANT COUNTRY CLEARANCE REQUEST',
      seafarer_position: "SEAFARER'S POSITION PROCESS REQUEST",
      watchlisted_employer: 'WATCHLISTED EMPLOYER PROECSS REQUEST',
      watchlisted_similar_name: 'WATCHLISTED OFW CLEARANCE REQUEST',
    }
    const rawDocName = typeToDocName[clearance.clearance_type] || 'CLEARANCE REQUEST'
    const sentenceCase = (s: string) => {
      const lower = s.trim().toLowerCase()
      return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : ''
    }
    const docName = sentenceCase(rawDocName)

    const upload = await FileUploadService.uploadBuffer(
      Buffer.from(report),
      `${docName}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      clearance.id,
      'clearance'
    )

    const document = await DatabaseService.createDocument({
      application_id: clearance.id,
      application_type: 'balik_manggagawa_clearance',
      document_type: docName,
      file_name: upload.fileName,
      file_path: upload.filePath,
      file_size: upload.fileSize,
      mime_type: upload.mimeType
    })

    return NextResponse.json<ApiResponse>({ success: true, data: document, message: 'Document generated and attached' })
  } catch (error) {
    console.error('Error generating BM clearance document:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json<ApiResponse>({ success: false, error: `Failed to generate document: ${errorMessage}` }, { status: 500 })
  }
}


