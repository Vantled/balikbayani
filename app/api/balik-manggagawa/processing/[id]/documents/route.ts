// app/api/balik-manggagawa/processing/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/database-service'
import { FileUploadService } from '@/lib/file-upload-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const documentType = formData.get('documentType') as string
    const file = formData.get('file') as File

    if (!documentType || !file) {
      return NextResponse.json(
        { success: false, error: 'Document type and file are required' },
        { status: 400 }
      )
    }

    // Upload file
    let uploadedFile;
    try {
      uploadedFile = await FileUploadService.uploadFile(file, id, documentType)
    } catch (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError instanceof Error ? uploadError.message : 'Failed to upload file' },
        { status: 500 }
      )
    }
    
    // Update processing record with file path
    const updateData: any = {}
    updateData[`${documentType}File`] = uploadedFile.fileName

    const updated = await DatabaseService.updateBalikManggagawaProcessing(id, updateData)
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update processing record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { filename: uploadedFile.fileName }
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { documentsCompleted } = body

    if (typeof documentsCompleted !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'documentsCompleted must be a boolean' },
        { status: 400 }
      )
    }

    // Update processing record
    const updated = await DatabaseService.updateBalikManggagawaProcessing(id, {
      documentsCompleted
    })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update processing record' },
        { status: 500 }
      )
    }

    // If documents are completed, move to clearance
    if (documentsCompleted) {
      const moved = await DatabaseService.moveProcessingToClearance(id)
      if (!moved) {
        return NextResponse.json(
          { success: false, error: 'Failed to move to clearance' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('Error completing documents:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
