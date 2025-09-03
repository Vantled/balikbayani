// app/api/direct-hire/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get existing documents for the application
    const result = await db.query(
      'SELECT id, document_type, file_name, file_path, created_at FROM direct_hire_documents WHERE application_id = $1 ORDER BY created_at DESC',
      [id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${documentType}_${timestamp}_${file.name}`
    const filePath = `uploads/direct-hire/${id}/${fileName}`

    // Store file in database
    const result = await db.query(
      'INSERT INTO direct_hire_documents (application_id, document_type, file_name, file_path, file_data, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [id, documentType, file.name, filePath, buffer]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to save document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        documentType,
        fileName: file.name,
        filePath
      }
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
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
    const { documentsCompleted, completedAt } = body

    if (documentsCompleted) {
      // Try to update application to mark documents as completed
      // Some databases may not yet have these columns; ignore missing-column error (42703)
      try {
        await db.query(
          'UPDATE direct_hire_applications SET documents_completed = $1, completed_at = $2 WHERE id = $3',
          [documentsCompleted, completedAt, id]
        )
      } catch (err: any) {
        if (err && err.code === '42703') {
          // Column does not exist; proceed without failing the request
          console.warn('documents_completed/completed_at columns missing; skipping update')
        } else {
          throw err
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully'
    })
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    )
  }
}
