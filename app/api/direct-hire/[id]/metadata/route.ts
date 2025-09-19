// app/api/direct-hire/[id]/metadata/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { buildDirectHireDocxData } from '@/lib/docx-common'
import { ApiResponse } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch core application and all related documents for metadata
    const application = await DatabaseService.getDirectHireApplicationById(id)
    if (!application) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const documents = await DatabaseService.getDocumentsByApplication(id, 'direct_hire')

    // Build the union metadata previously used across generators
    const common = buildDirectHireDocxData(application as any, documents as any)

    return NextResponse.json<ApiResponse>({ success: true, data: { metadata: common.data } })
  } catch (error) {
    console.error('Error building direct hire metadata:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to build metadata' }, { status: 500 })
  }
}


