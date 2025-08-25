// app/api/dashboard/recent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)
    const search = searchParams.get('search') || ''
    const filterQuery = searchParams.get('filterQuery') || ''

    // Fetch all data first to get total count and then paginate
    const [directHire, clearance, govToGov, infoSheet] = await Promise.all([
      DatabaseService.getDirectHireApplications({}, { page: 1, limit: 1000 }),
      DatabaseService.getClearances({}, { page: 1, limit: 1000 }),
      DatabaseService.getGovToGovApplications({}, { page: 1, limit: 1000 }),
      DatabaseService.getInformationSheetRecords({}, { page: 1, limit: 1000 }),
    ])

    type RecentItem = {
      id: string
      controlNumber: string
      name: string
      category: string
      jobsite: string
      sex: string
      status: string
      created_at: string
    }

    const dhItems: RecentItem[] = (directHire.data || []).map((row: any) => ({
      id: row.id,
      controlNumber: row.control_number,
      name: row.name,
      category: 'Direct Hire',
      jobsite: row.jobsite || '-',
      sex: row.sex || '-',
      status: row.status || '-',
      created_at: row.created_at,
    }))

    const bmItems: RecentItem[] = (clearance.data || []).map((row: any) => ({
      id: String(row.id),
      controlNumber: row.control_number || '-',
      name: row.name_of_worker || '-',
      category: 'Balik Manggagawa',
      jobsite: row.destination || '-',
      sex: row.sex || '-',
      status: row.clearance_type || '-',
      created_at: row.created_at,
    }))

    const g2gItems: RecentItem[] = (govToGov.data || []).map((row: any) => ({
      id: String(row.id),
      controlNumber: '-',
      name: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(', ').replace(', ,', ','),
      category: 'Gov to Gov',
      jobsite: '-',
      sex: row.sex || '-',
      status: '-',
      created_at: row.created_at,
    }))

    const infoItems: RecentItem[] = (infoSheet.data || []).map((row: any) => ({
      id: String(row.id),
      controlNumber: '-',
      name: [row.family_name, row.first_name, row.middle_name].filter(Boolean).join(', ').replace(', ,', ','),
      category: 'Information Sheet',
      jobsite: row.jobsite || '-',
      sex: row.gender || row.sex || '-', // Use gender field but fallback to sex if available
      status: row.requested_record || '-',
      created_at: row.created_at,
    }))

    let combined = [...dhItems, ...bmItems, ...g2gItems, ...infoItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Apply search and filter
    if (search || filterQuery) {
      const normalizedSearch = search.trim().toLowerCase()
      const normalizedFilterQuery = filterQuery.trim().toLowerCase()

      // Parse key:value filters and free-text terms
      const parseSearch = (input: string): { filters: Record<string, string>; terms: string[] } => {
        const tokens = input.split(/[\s,]+/).filter(Boolean)
        const filters: Record<string, string> = {}
        const terms: string[] = []
        for (const token of tokens) {
          const match = token.match(/^([a-z_]+):(.*)$/i)
          if (match && match[2] !== '') {
            filters[match[1].toLowerCase()] = match[2].toLowerCase()
          } else {
            terms.push(token.toLowerCase())
          }
        }
        return { filters, terms }
      }

      const matchesFilter = (application: any, key: string, value: string): boolean => {
        switch (key) {
          case 'name':
            return application.name.toLowerCase().includes(value)
          case 'sex':
            const appSex = application.sex?.toLowerCase().trim() || ''
            const filterValue = value.toLowerCase().trim()
            if (appSex === '-' || appSex === '' || appSex === 'null' || appSex === 'undefined') {
              return false
            }
            return appSex === filterValue
          case 'status':
            return application.status.toLowerCase().includes(value)
          case 'control':
          case 'control_number':
          case 'controlno':
            return application.controlNumber.toLowerCase().includes(value)
          case 'jobsite':
          case 'site':
            return application.jobsite.toLowerCase().includes(value)
          case 'category':
          case 'cat':
            return application.category.toLowerCase().includes(value)
          case 'date_range': {
            const [startStr, endStr] = value.split('|')
            if (!startStr || !endStr) return true
            const createdAtRaw = application.created_at
            if (!createdAtRaw) return false
            const created = new Date(createdAtRaw)
            if (isNaN(created.getTime())) return false
            const start = new Date(startStr)
            const end = new Date(endStr)
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return true
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)
            return created >= start && created <= end
          }
          default:
            const haystack = [
              application.controlNumber,
              application.name,
              application.sex,
              application.jobsite,
              application.category,
              application.status,
              application.created_at || '',
            ].join(' | ').toLowerCase()
            return haystack.includes(value)
        }
      }

      combined = combined.filter((application) => {
        const { filters: searchFilters, terms } = parseSearch(normalizedSearch)
        const { filters: panelFilters } = parseSearch(normalizedFilterQuery)
        const combinedFilters = { ...searchFilters, ...panelFilters }

        if (!normalizedSearch && !normalizedFilterQuery) return true

        // All key:value filters must match
        const allFiltersMatch = Object.entries(combinedFilters).every(([k, v]) => {
          const match = matchesFilter(application, k, v)
          return match
        })
        if (!allFiltersMatch) return false

        if (terms.length === 0) return true

        // Free-text terms: require every term to appear somewhere in the haystack
        const fields: string[] = []
        fields.push(application.controlNumber)
        fields.push(application.name)
        fields.push(application.sex)
        fields.push(application.jobsite)
        fields.push(application.category)
        fields.push(application.status)
        fields.push(application.created_at || '')
        
        const haystack = fields.join(' | ').toLowerCase()
        return terms.every(term => haystack.includes(term))
      })
    }

    const total = combined.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = combined.slice(startIndex, endIndex)

    return NextResponse.json({ 
      success: true, 
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get recent applications error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


