// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import FileUploadService from '@/lib/file-upload';
import { ApiResponse } from '@/lib/types';
import { recordDocumentAudit } from '@/lib/server/document-audit';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const applicationId = formData.get('applicationId') as string;
    const applicationType = formData.get('applicationType') as string;
    const documentName = formData.get('documentName') as string;
    const metaRaw = formData.get('meta') as string | null;
    let meta: any = null;
    if (metaRaw) {
      try { meta = JSON.parse(metaRaw); } catch {}
    }

    // Validate required fields
    if (!file || !applicationId || !applicationType || !documentName) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: file, applicationId, applicationType, documentName'
      }, { status: 400 });
    }

    // Validate file type
    if (!FileUploadService.validateFileType(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Allowed types: PDF, images, Word, Excel documents'
      }, { status: 400 });
    }

    // Convert File to Buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer());
    const multerFile = {
      originalname: file.name,
      buffer,
      size: file.size,
      mimetype: file.type
    } as Express.Multer.File;

    // Save file to filesystem
    const uploadedFile = await FileUploadService.saveFile(
      multerFile,
      applicationType,
      applicationId
    );

    // Save document record to database
    const document = await DatabaseService.createDocument({
      application_id: applicationId,
      application_type: applicationType,
      document_type: documentName, // Use the custom document name as the document type
      file_name: uploadedFile.originalName,
      file_path: uploadedFile.filePath,
      file_size: uploadedFile.fileSize,
      mime_type: uploadedFile.mimeType,
      // optional metadata
      meta
    });

    await recordDocumentAudit(request, 'create', document, {
      newValues: {
        document_name: document.document_type,
        file_name: document.file_name,
      },
      applicationNewValues: {
        document_name: document.document_type,
        file_name: document.file_name,
      },
    });

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload document'
    }, { status: 500 });
  }
}
