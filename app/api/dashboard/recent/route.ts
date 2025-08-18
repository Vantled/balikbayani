// app/api/dashboard/recent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // Fetch latest from each category
    const [directHire, clearance, govToGov, infoSheet] = await Promise.all([
      DatabaseService.getDirectHireApplications({}, { page: 1, limit }),
      DatabaseService.getClearances({}, { page: 1, limit }),
      DatabaseService.getGovToGovApplications({}, { page: 1, limit }),
      DatabaseService.getInformationSheetRecords({}, { page: 1, limit }),
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
      sex: row.gender || '-',
      status: row.requested_record || '-',
      created_at: row.created_at,
    }))

    const combined = [...dhItems, ...bmItems, ...g2gItems, ...infoItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return NextResponse.json({ success: true, data: combined })
  } catch (error) {
    console.error('Get recent applications error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


