// app/api/documents/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { FileUploadService } from '@/lib/file-upload-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get document info from database
    const document = await DatabaseService.getDocumentById(id);
    
    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Read the file from storage (document.file_path may already include /uploads or \uploads)
    const cleaned = document.file_path.replace(/^[\\/]+/, '');
    const lower = cleaned.toLowerCase();
    const startsWithUploads = lower.startsWith('uploads' + '/') || lower.startsWith('uploads' + '\\') || lower === 'uploads' || lower.startsWith('uploads');
    const normalizedPath = startsWithUploads
      ? join(process.cwd(), cleaned)
      : join(process.cwd(), 'uploads', cleaned);
    const fileBuffer = await readFile(normalizedPath);
    
    // Set appropriate headers based on file type
    const headers = new Headers();
    headers.set('Content-Type', document.mime_type);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', `inline; filename="${document.file_name}"`);
    
    // Add cache control headers
    headers.set('Cache-Control', 'public, max-age=3600');
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error viewing document:', error);
    return new NextResponse('Failed to view document', { status: 500 });
  }
}
