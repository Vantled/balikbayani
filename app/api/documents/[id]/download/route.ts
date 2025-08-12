// app/api/documents/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import FileUploadService from '@/lib/file-upload';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get document info from database
    const document = await DatabaseService.getDocumentById(id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get full file path
    const filePath = FileUploadService.getFilePath(document.file_path);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found on server' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', document.mime_type);
    headers.set('Content-Disposition', `inline; filename="${document.file_name}"`);
    headers.set('Content-Length', document.file_size.toString());
    
    // Return file
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}
