// app/api/direct-hire/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { FileUploadService } from '@/lib/file-upload-service';
import { ApiResponse } from '@/lib/types';
import { recordAuditLog } from '@/lib/server/audit-logger';
import { recordDocumentAudit } from '@/lib/server/document-audit';
import { serializeDirectHireApplication } from '@/lib/server/serializers/direct-hire';
import createReport from 'docx-templates';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSearch = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',') : undefined;
    const sex = searchParams.get('sex') || undefined;
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    const includeFinished = searchParams.get('include_finished') === 'true';
    const includeProcessing = searchParams.get('include_processing') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Parse key:value terms from search bar (e.g., sex:male evaluator:john position:nurse jobsite:hk control:ABC)
    const parsed: any = {};
    const freeTextParts: string[] = [];
    if (rawSearch) {
      const tokens = rawSearch.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const [k, ...rest] = token.split(':');
        if (!rest.length) { freeTextParts.push(token); continue; }
        const v = rest.join(':');
        switch (k.toLowerCase()) {
          case 'sex':
            if (v.toLowerCase() === 'male' || v.toLowerCase() === 'female') parsed.sex = v.toLowerCase();
            break;
          case 'jobsite':
            parsed.jobsite = v;
            break;
          case 'position':
            parsed.position = v;
            break;
          case 'evaluator':
            parsed.evaluator = v;
            break;
          case 'control':
          case 'control_number':
            parsed.control_number = v;
            break;
          case 'date':
          case 'date_range': {
            const [from, to] = v.split('|');
            if (from) parsed.date_from = from;
            if (to) parsed.date_to = to;
            break;
          }
          default:
            freeTextParts.push(token);
        }
      }
    }
    const search = freeTextParts.length ? freeTextParts.join(' ') : undefined;

    const filters: any = {
      search,
      status,
      sex: (parsed.sex || sex) as 'male' | 'female' | undefined,
      include_deleted: includeDeleted,
      include_finished: includeFinished,
      include_processing: includeProcessing
    };
    // Pass parsed key filters if present
    if (parsed.jobsite) filters.jobsite = parsed.jobsite;
    if (parsed.position) filters.position = parsed.position;
    if (parsed.evaluator) filters.evaluator = parsed.evaluator;
    if (parsed.control_number) filters.control_number = parsed.control_number;
    if (parsed.date_from) filters.date_from = parsed.date_from;
    if (parsed.date_to) filters.date_to = parsed.date_to;

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
      
      // debug logs removed
      
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

      // Extract metadata for status checklist from form fields
      const processedWorkersPrincipal = formData.get('processed_workers_principal') as string | null
      const processedWorkersLas = formData.get('processed_workers_las') as string | null
      const verifierType = formData.get('verifier_type') as string | null
      const verifierOffice = formData.get('verifier_office') as string | null
      const pePcgCity = formData.get('pe_pcg_city') as string | null
      const othersText = formData.get('others_text') as string | null
      const verifiedDate = formData.get('verified_date') as string | null
      const timeReceived = formData.get('time_received') as string | null
      const timeReleased = formData.get('time_released') as string | null

      // Generate control number automatically
      const controlNumber = await DatabaseService.generateDirectHireControlNumber();

      // Create the application first
      const applicationData = {
        control_number: controlNumber,
        name: (name || '').toUpperCase(),
        sex: (sex as 'male' | 'female') || 'male',
        salary: status === 'draft' ? (salary ? parseFloat(salary) : 0) : parseFloat(salary),
        status: status as 'draft' | 'pending' | 'evaluated' | 'for_confirmation' | 'emailed_to_dhad' | 'received_from_dhad' | 'for_interview' | 'approved' | 'rejected',
        jobsite: (status === 'draft' ? (jobsite || 'To be filled') : jobsite || '').toUpperCase(),
        position: (status === 'draft' ? (position || 'To be filled') : position || '').toUpperCase(),
        job_type: (job_type as 'household' | 'professional') || 'professional',
        evaluator: (evaluator || '').toUpperCase(),
        employer: (employer || '').toUpperCase(),
        salary_currency: salaryCurrency || 'USD',
        raw_salary: status === 'draft' ? (salary ? parseFloat(salary) : 0) : parseFloat(salary),
        email: (formData.get('email') as string) || '',
        cellphone: (formData.get('cellphone') as string) || '',
        time_received: timeReceived || null,
        time_released: timeReleased || null,
        status_checklist: (() => {
          if (status === 'draft') {
            return {
              evaluated: { checked: false, timestamp: undefined },
              for_confirmation: { checked: false, timestamp: undefined },
              emailed_to_dhad: { checked: false, timestamp: undefined },
              received_from_dhad: { checked: false, timestamp: undefined },
              for_interview: { checked: false, timestamp: undefined },
              // Persist metadata inside checklist for compatibility
              for_interview_meta: {
                processed_workers_principal: processedWorkersPrincipal ? Number(processedWorkersPrincipal) : 0,
                processed_workers_las: processedWorkersLas ? Number(processedWorkersLas) : 0,
              },
              for_confirmation_meta: {
                verifier_type: verifierType ? verifierType.toUpperCase() : '',
                verifier_office: verifierOffice || '',
                pe_pcg_city: pePcgCity || '',
                others_text: othersText || '',
                verified_date: verifiedDate || '',
              }
            }
          }
          const evaluatedChecked = status === 'evaluated'
          return {
            evaluated: { checked: evaluatedChecked, timestamp: evaluatedChecked ? new Date().toISOString() : undefined },
            for_confirmation: { checked: false, timestamp: undefined },
            emailed_to_dhad: { checked: false, timestamp: undefined },
            received_from_dhad: { checked: false, timestamp: undefined },
            for_interview: { checked: false, timestamp: undefined },
            for_interview_meta: {
              processed_workers_principal: processedWorkersPrincipal ? Number(processedWorkersPrincipal) : 0,
              processed_workers_las: processedWorkersLas ? Number(processedWorkersLas) : 0,
            },
            for_confirmation_meta: {
              verifier_type: verifierType ? verifierType.toUpperCase() : '',
              verifier_office: verifierOffice || '',
              pe_pcg_city: pePcgCity || '',
              others_text: othersText || '',
              verified_date: verifiedDate || '',
            }
          }
        })()
      };

      console.log('Saving application data:', applicationData);
      const application = await DatabaseService.createDirectHireApplication(applicationData);
      console.log('Saved application:', application);

      await recordAuditLog(request, {
        action: 'create',
        tableName: 'direct_hire_applications',
        recordId: application.id,
        newValues: {
          control_number: application.control_number,
        },
      });

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
          uploadedDocuments.push(document);
        } catch (error) {
          console.error('Error uploading TESDA document:', error);
        }
      }

      // Auto-generate clearance document removed per user request

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
      
      console.log('API received JSON data:', body);
      console.log('Evaluator field in JSON:', body.evaluator);
      console.log('Email field in JSON:', body.email);
      console.log('Cellphone field in JSON:', body.cellphone);
      
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
        email: body.email || '',
        cellphone: body.cellphone || '',
        sex: body.sex as 'male' | 'female',
        // Persist static converted salary and raw fields when provided
        salary: typeof body.salary === 'number' ? body.salary : parseFloat(String(body.salary || '0')),
        raw_salary: typeof body.raw_salary === 'number' ? body.raw_salary : (
          body.raw_salary != null ? parseFloat(String(body.raw_salary)) : undefined
        ),
        salary_currency: body.salary_currency || undefined,
        status: (body.status || 'pending') as 'pending' | 'evaluated' | 'for_confirmation' | 'emailed_to_dhad' | 'received_from_dhad' | 'for_interview' | 'approved' | 'rejected',
        jobsite: body.jobsite,
        position: body.position,
        job_type: body.job_type as 'household' | 'professional' || 'professional',
        evaluator: body.evaluator || '',
        employer: body.employer || '',
        status_checklist: (() => {
          const evaluatedChecked = body.status === 'evaluated'
          return {
            evaluated: { checked: evaluatedChecked, timestamp: evaluatedChecked ? new Date().toISOString() : undefined },
            for_confirmation: { checked: false, timestamp: undefined },
            emailed_to_dhad: { checked: false, timestamp: undefined },
            received_from_dhad: { checked: false, timestamp: undefined },
            for_interview: { checked: false, timestamp: undefined }
          }
        })()
      };

      // Attach optional metadata into status_checklist if provided
      const applicationDataWithMeta = {
        ...applicationData,
        status_checklist: {
          ...(applicationData as any).status_checklist,
          for_interview_meta: body.for_interview_meta || undefined,
          for_confirmation_meta: body.for_confirmation_meta || undefined,
        }
      }

      const result = await DatabaseService.createDirectHireApplication(applicationDataWithMeta as any);

      await recordAuditLog(request, {
        action: 'create',
        tableName: 'direct_hire_applications',
        recordId: result.id,
        newValues: serializeDirectHireApplication(result),
      });

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
