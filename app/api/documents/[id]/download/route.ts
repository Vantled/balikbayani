// app/api/documents/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import FileUploadService from '@/lib/file-upload';
import fs from 'fs';

interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const documentId = params.id;

    // Get document from database
    const document = await DatabaseService.getDocumentById(documentId);
    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    // Check if file exists
    const fileInfo = FileUploadService.getFileInfo(document.file_path);
    if (!fileInfo.exists) {
      return NextResponse.json({
        success: false,
        error: 'File not found on server'
      }, { status: 404 });
    }

    // Read file
    const filePath = FileUploadService.getFilePath(document.file_path);
    const fileBuffer = fs.readFileSync(filePath);

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mime_type,
        'Content-Disposition': `attachment; filename="${document.file_name}"`,
        'Content-Length': document.file_size.toString()
      }
    });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to download document'
    }, { status: 500 });
  }
}
