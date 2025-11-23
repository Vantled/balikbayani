// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { FileUploadService } from '@/lib/file-upload-service';
import { ApiResponse } from '@/lib/types';
import { recordDocumentAudit } from '@/lib/server/document-audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const applicationType = searchParams.get('applicationType');

    if (!applicationId || !applicationType) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required parameters: applicationId and applicationType'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const documents = await DatabaseService.getDocumentsByApplication(applicationId, applicationType);

    const response: ApiResponse = {
      success: true,
      data: documents
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch documents'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const applicationId = formData.get('applicationId') as string;
    const applicationType = formData.get('applicationType') as string;
    const documentType = formData.get('documentType') as string;

    // Validate required fields
    if (!file || !applicationId || !applicationType || !documentType) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: file, applicationId, applicationType, or documentType'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Upload file
    const uploadResult = await FileUploadService.uploadFile(file, applicationId, documentType);

    // Create document record in database
    const documentData = {
      application_id: applicationId,
      application_type: applicationType,
      document_type: documentType,
      file_name: uploadResult.fileName,
      file_path: uploadResult.filePath,
      file_size: uploadResult.fileSize,
      mime_type: uploadResult.mimeType
    };

    const document = await DatabaseService.createDocument(documentData);

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

    const response: ApiResponse = {
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
