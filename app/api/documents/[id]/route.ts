// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import FileUploadService from '@/lib/file-upload';
import { ApiResponse } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { documentName } = body;

    if (!documentName || typeof documentName !== 'string' || documentName.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: 'Document name is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get document info from database
    const document = await DatabaseService.getDocumentById(id);
    
    if (!document) {
      const response: ApiResponse = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Update document name in database
    const { db } = await import('@/lib/database');
    const { rows } = await db.query(
      'UPDATE documents SET document_type = $1 WHERE id = $2 RETURNING *',
      [documentName.trim(), id]
    );

    if (rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      data: rows[0],
      message: 'Document name updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating document:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update document'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get document info from database
    const document = await DatabaseService.getDocumentById(id);
    
    if (!document) {
      const response: ApiResponse = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Delete file from storage
    try {
      await FileUploadService.deleteFile(document.file_path);
    } catch (error) {
      console.warn('Failed to delete file from storage:', error);
    }

    // Delete document record from database
    const { db } = await import('@/lib/database');
    const { rowCount } = await db.query(
      'DELETE FROM documents WHERE id = $1',
      [id]
    );

    if ((rowCount || 0) === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Document not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Document deleted successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting document:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete document'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
