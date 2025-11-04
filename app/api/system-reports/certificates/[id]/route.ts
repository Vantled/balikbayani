// app/api/system-reports/certificates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { ApiResponse } from '@/lib/types'
import { checkAdmin } from '@/lib/check-admin'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { FileUploadService } from '@/lib/file-upload-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin access
    const { isAdmin: userIsAdmin } = await checkAdmin(request)
    if (!userIsAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { id } = await params
    const certificate = await DatabaseService.getSystemReportCertificateById(id)

    if (!certificate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Read file from filesystem
    const filePath = FileUploadService.getFilePath(certificate.file_path)
    const fileData = await readFile(filePath)

    return new NextResponse(fileData, {
      headers: {
        'Content-Type': certificate.mime_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${certificate.file_name}"`
      }
    })
  } catch (error) {
    console.error('Get system report certificate file error:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    // Check admin access
    const { isAdmin: userIsAdmin, user } = await checkAdmin(request)
    if (!userIsAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { id } = await params
    const certificate = await DatabaseService.getSystemReportCertificateById(id)

    if (!certificate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Delete file from filesystem
    await FileUploadService.deleteFile(certificate.file_path)

    // Delete record from database
    const deleted = await DatabaseService.deleteSystemReportCertificate(id)

    if (!deleted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to delete certificate' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Certificate deleted successfully'
    })
  } catch (error) {
    console.error('Delete system report certificate error:', error)
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

