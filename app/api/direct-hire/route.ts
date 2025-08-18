// app/api/direct-hire/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { FileUploadService } from '@/lib/file-upload-service';
import { ApiResponse } from '@/lib/types';
import createReport from 'docx-templates';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const sex = searchParams.get('sex') || undefined;
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const filters = {
      search,
      status,
      sex: sex as 'male' | 'female' | undefined,
      include_deleted: includeDeleted
    };

    const pagination = {
      page,
      limit
    };

    const result = await DatabaseService.getDirectHireApplications(filters, pagination);

    const response: ApiResponse = {
      success: true,
      data: result
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching direct hire applications:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch direct hire applications'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload with FormData
      const formData = await request.formData();
      
      // Extract application data
      const name = formData.get('name') as string;
      const sex = formData.get('sex') as string;
      const salary = formData.get('salary') as string;
      const status = formData.get('status') as string;
      const jobsite = formData.get('jobsite') as string;
      const position = formData.get('position') as string;
      const job_type = formData.get('job_type') as string;
      const evaluator = formData.get('evaluator') as string;
      const employer = formData.get('employer') as string | null;
      const salaryCurrency = formData.get('salaryCurrency') as string | null;
      
      // Validate required fields based on status
      if (status === 'draft') {
        // For drafts, only name is required
        if (!formData.get('name')) {
          const response: ApiResponse = {
            success: false,
            error: 'Missing required field: name'
          };
          return NextResponse.json(response, { status: 400 });
        }
      } else {
        // For regular applications, all fields are required
        const requiredFields = ['name', 'sex', 'salary', 'jobsite', 'position'];
        for (const field of requiredFields) {
          if (!formData.get(field)) {
            const response: ApiResponse = {
              success: false,
              error: `Missing required field: ${field}`
            };
            return NextResponse.json(response, { status: 400 });
          }
        }
      }

      // Generate control number automatically
      const controlNumber = await DatabaseService.generateDirectHireControlNumber();

      // Create the application first
      const applicationData = {
        control_number: controlNumber,
        name,
        sex: sex as 'male' | 'female' || 'male',
        salary: status === 'draft' ? (salary ? parseFloat(salary) : 0) : parseFloat(salary),
        status: status as 'draft' | 'pending' | 'evaluated' | 'for_confirmation' | 'emailed_to_dhad' | 'received_from_dhad' | 'for_interview' | 'approved' | 'rejected',
        jobsite: status === 'draft' ? (jobsite || 'To be filled') : jobsite,
        position: status === 'draft' ? (position || 'To be filled') : position,
        job_type: job_type as 'household' | 'professional' || 'professional',
        evaluator: evaluator || '',
        employer: employer || '',
        status_checklist: status === 'draft' ? {
          evaluated: { checked: false, timestamp: undefined },
          for_confirmation: { checked: false, timestamp: undefined },
          emailed_to_dhad: { checked: false, timestamp: undefined },
          received_from_dhad: { checked: false, timestamp: undefined },
          for_interview: { checked: false, timestamp: undefined }
        } : {
          evaluated: { checked: true, timestamp: new Date().toISOString() },
          for_confirmation: { checked: false, timestamp: undefined },
          emailed_to_dhad: { checked: false, timestamp: undefined },
          received_from_dhad: { checked: false, timestamp: undefined },
          for_interview: { checked: false, timestamp: undefined }
        }
      };

      const application = await DatabaseService.createDirectHireApplication(applicationData);

      // Handle file uploads
      const uploadedDocuments = [];
      
      // Process passport file
      const passportFile = formData.get('passport') as File;
      if (passportFile && passportFile.size > 0) {
        try {
          const uploadResult = await FileUploadService.uploadFile(
            passportFile, 
            application.id, 
            'passport'
          );
          const documentData = {
            application_id: application.id,
            application_type: 'direct_hire',
            document_type: 'passport',
            file_name: uploadResult.fileName,
            file_path: uploadResult.filePath,
            file_size: uploadResult.fileSize,
            mime_type: uploadResult.mimeType
          };
          const document = await DatabaseService.createDocument(documentData);
          uploadedDocuments.push(document);
        } catch (error) {
          console.error('Error uploading passport:', error);
        }
      }

      // Process visa file
      const visaFile = formData.get('visa') as File;
      if (visaFile && visaFile.size > 0) {
        try {
          const uploadResult = await FileUploadService.uploadFile(
            visaFile, 
            application.id, 
            'visa'
          );
          const documentData = {
            application_id: application.id,
            application_type: 'direct_hire',
            document_type: 'visa',
            file_name: uploadResult.fileName,
            file_path: uploadResult.filePath,
            file_size: uploadResult.fileSize,
            mime_type: uploadResult.mimeType
          };
          const document = await DatabaseService.createDocument(documentData);
          uploadedDocuments.push(document);
        } catch (error) {
          console.error('Error uploading visa:', error);
        }
      }

      // Process TESDA file
      const tesdaFile = formData.get('tesda') as File;
      if (tesdaFile && tesdaFile.size > 0) {
        try {
          const uploadResult = await FileUploadService.uploadFile(
            tesdaFile, 
            application.id, 
            'tesda'
          );
          const documentData = {
            application_id: application.id,
            application_type: 'direct_hire',
            document_type: 'tesda',
            file_name: uploadResult.fileName,
            file_path: uploadResult.filePath,
            file_size: uploadResult.fileSize,
            mime_type: uploadResult.mimeType
          };
          const document = await DatabaseService.createDocument(documentData);
          uploadedDocuments.push(document);
        } catch (error) {
          console.error('Error uploading TESDA document:', error);
        }
      }

      // Auto-generate clearance document (only for non-draft)
      if (status !== 'draft') {
        try {
          const templatePath = join(process.cwd(), 'public', 'templates', 'direct-hire-clearance.docx');
          const template = await readFile(templatePath);
          const createdDate = new Date().toISOString().slice(0, 10);
          const report = await createReport({
            template,
            data: {
              control_number: controlNumber,
              name,
              sex,
              job_type,
              employer: employer || '',
              jobsite,
              position,
              salary,
              salary_currency: salaryCurrency || 'USD',
              evaluator: evaluator || '',
              created_date: createdDate
            },
            cmdDelimiter: ['{{', '}}']
          });
          // Save as DOCX (fallback attachment)
          const docxUpload = await FileUploadService.uploadBuffer(Buffer.from(report), `DH-${controlNumber}-clearance.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', application.id, 'clearance');
          const docxRecord = await DatabaseService.createDocument({
            application_id: application.id,
            application_type: 'direct_hire',
            document_type: 'clearance',
            file_name: docxUpload.fileName,
            file_path: docxUpload.filePath,
            file_size: docxUpload.fileSize,
            mime_type: docxUpload.mimeType
          });
          uploadedDocuments.push(docxRecord);
        } catch (err) {
          console.error('Error generating clearance document:', err);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          ...application,
          documents: uploadedDocuments
        },
        message: 'Direct hire application created successfully with documents'
      };

      return NextResponse.json(response, { status: 201 });
    } else {
      // Handle JSON request (backward compatibility)
      const body = await request.json();
      
      // Validate required fields
      const requiredFields = ['name', 'sex', 'salary', 'jobsite', 'position'];
      for (const field of requiredFields) {
        if (!body[field]) {
          const response: ApiResponse = {
            success: false,
            error: `Missing required field: ${field}`
          };
          return NextResponse.json(response, { status: 400 });
        }
      }

      // Generate control number automatically
      const controlNumber = await DatabaseService.generateDirectHireControlNumber();

      // Create the application
      const applicationData = {
        control_number: controlNumber,
        name: body.name,
        sex: body.sex as 'male' | 'female',
        salary: parseFloat(body.salary),
        status: (body.status || 'pending') as 'pending' | 'evaluated' | 'for_confirmation' | 'emailed_to_dhad' | 'received_from_dhad' | 'for_interview' | 'approved' | 'rejected',
        jobsite: body.jobsite,
        position: body.position,
        job_type: body.job_type as 'household' | 'professional' || 'professional',
        evaluator: body.evaluator || '',
        employer: body.employer || '',
        status_checklist: {
          evaluated: { checked: true, timestamp: new Date().toISOString() },
          for_confirmation: { checked: false, timestamp: undefined },
          emailed_to_dhad: { checked: false, timestamp: undefined },
          received_from_dhad: { checked: false, timestamp: undefined },
          for_interview: { checked: false, timestamp: undefined }
        }
      };

      const result = await DatabaseService.createDirectHireApplication(applicationData);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Direct hire application created successfully'
      };

      return NextResponse.json(response, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating direct hire application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create direct hire application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
