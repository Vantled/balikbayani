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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'original';
    const dispositionQuery = searchParams.get('disposition');
    
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

    let fileBuffer: Buffer;
    let contentType: string;
    let fileName: string;

    // Read the original file
    fileBuffer = await readFile(filePath);
    contentType = document.mime_type;
    fileName = document.file_name;
    
    // Handle format conversion requests
    if (format === 'pdf' && (document.mime_type.includes('word') || document.file_name.toLowerCase().endsWith('.docx'))) {
      // Return error for DOCX to PDF conversion since it's not implemented
      return NextResponse.json(
        { 
          error: 'PDF conversion is not currently supported. Please download the original document format.',
          originalFormat: 'docx',
          requestedFormat: 'pdf'
        },
        { status: 400 }
      );
    } else if (format === 'docx' && (document.mime_type.includes('pdf') || document.file_name.toLowerCase().endsWith('.pdf'))) {
      // Return error for PDF to DOCX conversion since it's not implemented
      return NextResponse.json(
        { 
          error: 'DOCX conversion is not currently supported. Please download the original document format.',
          originalFormat: 'pdf',
          requestedFormat: 'docx'
        },
        { status: 400 }
      );
    }
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    // Preview inline when explicitly requested, or for PDFs/images by default
    const isPreviewableDefault = contentType.includes('pdf') || contentType.startsWith('image/');
    const forceInline = dispositionQuery === 'inline';
    const contentDisposition = `${forceInline || isPreviewableDefault ? 'inline' : 'attachment'}; filename="${fileName}"`;
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Content-Length', fileBuffer.length.toString());
    
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
