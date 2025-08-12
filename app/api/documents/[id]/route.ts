// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { FileUploadService } from '@/lib/file-upload-service';
import { ApiResponse } from '@/lib/types';

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
