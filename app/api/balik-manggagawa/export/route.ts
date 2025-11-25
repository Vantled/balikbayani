// app/api/balik-manggagawa/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { AuthService } from '@/lib/services/auth-service'
import { exportToExcel } from '@/lib/excel-export-service'

type ParsedTokens = {
  filters: Record<string, string>
  terms: string[]
}

const parseTokens = (input: string): ParsedTokens => {
  const filters: Record<string, string> = {}
  const terms: string[] = []
  if (!input) return { filters, terms }

  const tokens = input.split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    const [key, ...rest] = token.split(':')
    if (!rest.length) {
      terms.push(token)
      continue
    }
    filters[key.toLowerCase()] = rest.join(':')
  }
  return { filters, terms }
}

const pickFilter = (...values: Array<string | null | undefined>): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }
  return undefined
}

const toBoolean = (value: string | null | undefined): boolean => value === 'true'

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

const formatDuration = (start: string | null | undefined, end: string | null | undefined): string => {
  if (!start || !end) return ''
  try {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    if (Number.isNaN(diffMs) || diffMs < 0) return ''
    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  } catch {
    return ''
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('bb_auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await AuthService.validateSession(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawSearch = searchParams.get('search') || ''
    const panelQuery = searchParams.get('panelQuery') || ''

    const { filters: searchFilters, terms } = parseTokens(rawSearch)
    const { filters: panelFilters } = parseTokens(panelQuery)

    const clearanceType = pickFilter(
      searchParams.get('clearanceType'),
      panelFilters.clearancetype,
      searchFilters.clearancetype
    )
    const sex = pickFilter(
      searchParams.get('sex'),
      panelFilters.sex,
      searchFilters.sex
    )
    const status = pickFilter(
      searchParams.get('status'),
      panelFilters.status,
      searchFilters.status
    )
    const dateFrom = pickFilter(
      searchParams.get('dateFrom'),
      panelFilters.datefrom,
      searchFilters.datefrom
    )
    const dateTo = pickFilter(
      searchParams.get('dateTo'),
      panelFilters.dateto,
      searchFilters.dateto
    )
    const jobsite = pickFilter(
      searchParams.get('jobsite'),
      panelFilters.jobsite || panelFilters.destination,
      searchFilters.jobsite || searchFilters.destination
    )
    const position = pickFilter(
      searchParams.get('position'),
      panelFilters.position,
      searchFilters.position
    )
    const showDeletedOnly =
      toBoolean(searchParams.get('showDeletedOnly')) || toBoolean(panelFilters.showdeletedonly)
    const includeDeleted = toBoolean(searchParams.get('includeDeleted'))

    const freeText = terms.length ? terms.join(' ') : undefined

    const result = await DatabaseService.getBalikManggagawaClearances({
      page: 1,
      limit: 10000,
      search: freeText,
      clearanceType,
      sex,
      status,
      dateFrom,
      dateTo,
      jobsite,
      position,
      include_deleted: includeDeleted,
      show_deleted_only: showDeletedOnly,
    })

    const excelData = result.data.map((record, index) => ({
      or_no: index + 1,
      full_name: record.name_of_worker || '',
      sex: (record.sex || '').toUpperCase(),
      destination: record.destination || '',
      time_in: formatTime(record.time_received),
      time_out: formatTime(record.time_released),
      total_pct: formatDuration(record.time_received, record.time_released),
      evaluator: record.evaluator || '',
    }))

    const excelBuffer = await exportToExcel({
      templateName: 'balik manggagawa.xlsx',
      data: excelData,
      startRow: 12,
    })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="balik-manggagawa.xlsx"',
      },
    })
  } catch (error) {
    console.error('Error exporting Balik Manggagawa data:', error)
    return NextResponse.json(
      { error: 'Failed to export Balik Manggagawa data' },
      { status: 500 }
    )
  }
}

