// app/api/direct-hire/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';
import { recordAuditLog } from '@/lib/server/audit-logger';
import { serializeDirectHireApplication } from '@/lib/server/serializers/direct-hire';
import { extractChangedValues } from '@/lib/utils/objectDiff';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const application = await DatabaseService.getDirectHireApplicationById(id);

    if (!application) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      data: application
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching direct hire application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch direct hire application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if application exists
    const existingApplication = await DatabaseService.getDirectHireApplicationById(id);
    if (!existingApplication) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name) updateData.name = String(body.name).toUpperCase();
    if (body.email !== undefined) updateData.email = String(body.email || '');
    if (body.cellphone !== undefined) updateData.cellphone = String(body.cellphone || '');
    if (body.sex) updateData.sex = body.sex as any;
    if (body.salary !== undefined) updateData.salary = Number(body.salary);
    if (body.raw_salary !== undefined) updateData.raw_salary = Number(body.raw_salary);
    if (body.salary_currency) updateData.salary_currency = body.salary_currency;
    if (body.status) updateData.status = body.status;
    if (body.jobsite) updateData.jobsite = String(body.jobsite).toUpperCase();
    if (body.position) updateData.position = String(body.position).toUpperCase();
    if (body.job_type) updateData.job_type = body.job_type as any;
    if (body.evaluator !== undefined && body.evaluator !== null && body.evaluator !== '') updateData.evaluator = String(body.evaluator).toUpperCase();
    if (body.employer !== undefined) updateData.employer = String(body.employer || '').toUpperCase();
    // Note: time_received and time_released are intentionally excluded from updates
    // They should only be set during creation and cannot be modified afterward

    // Merge metadata into status_checklist if provided
    if (body.for_interview_meta || body.for_confirmation_meta) {
      const existingSc: any = (existingApplication as any).status_checklist || {}
      updateData.status_checklist = {
        ...existingSc,
        ...(body.status_checklist || {}),
        ...(body.for_interview_meta ? { for_interview_meta: body.for_interview_meta } : {}),
        ...(body.for_confirmation_meta ? { for_confirmation_meta: body.for_confirmation_meta } : {}),
      }
    }

    // If client didn't send checklist but sets status to evaluated, set it here
    if (body.status === 'evaluated' && !body.status_checklist) {
      updateData.status_checklist = {
        evaluated: { checked: true, timestamp: new Date().toISOString() },
        for_confirmation: { checked: false, timestamp: undefined },
        emailed_to_dhad: { checked: false, timestamp: undefined },
        received_from_dhad: { checked: false, timestamp: undefined },
        for_interview: { checked: false, timestamp: undefined }
      };
    }

    // Allow explicit status_checklist updates too
    if (body.status_checklist) {
      updateData.status_checklist = body.status_checklist;
    }

    const result = await DatabaseService.updateDirectHireApplication(id, updateData);

    if (result) {
      const before = serializeDirectHireApplication(existingApplication);
      const after = serializeDirectHireApplication(result);
      const { oldValues, newValues } = extractChangedValues(before, after, { ignoreKeys: ['id'] });

      if (Object.keys(oldValues).length > 0 || Object.keys(newValues).length > 0) {
        // Determine specific action based on status change
        let auditAction = 'update';
        const oldStatus = existingApplication.status;
        const newStatus = result.status;
        
        // Record all status changes, not just approved/rejected
        if (oldStatus !== newStatus) {
          auditAction = 'update';
          // Include status change in audit log
          oldValues.status = oldStatus;
          newValues.status = newStatus;

          // Create notification for applicant if application belongs to one
          if (result.applicant_user_id) {
            try {
              const { NotificationService } = await import('@/lib/services/notification-service');
              await NotificationService.notifyStatusChange(
                result.applicant_user_id,
                'direct_hire',
                result.id,
                oldStatus,
                newStatus,
                result.control_number || undefined
              );
            } catch (error) {
              console.error('Error creating notification:', error);
              // Don't fail the request if notification creation fails
            }
          }
        }
        
        if (newStatus === 'approved' && oldStatus !== 'approved') {
          auditAction = 'approved';
        } else if (newStatus === 'rejected' && oldStatus !== 'rejected') {
          auditAction = 'rejected';
        }

        await recordAuditLog(request, {
          action: auditAction,
          tableName: 'direct_hire_applications',
          recordId: id,
          oldValues: auditAction !== 'update' ? { status: oldStatus } : oldValues,
          newValues: auditAction !== 'update' ? { status: newStatus } : newValues,
        });
      }
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Direct hire application updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating direct hire application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update direct hire application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if application exists
    const existingApplication = await DatabaseService.getDirectHireApplicationById(id);
    if (!existingApplication) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Prepare update data for status checklist
    const updateData: any = {};
    if (body.status_checklist) {
      updateData.status_checklist = body.status_checklist;
    }

    const result = await DatabaseService.updateDirectHireApplication(id, updateData);

    if (result) {
      const before = serializeDirectHireApplication(existingApplication);
      const after = serializeDirectHireApplication(result);
      const { oldValues, newValues } = extractChangedValues(before, after, { ignoreKeys: ['id'] });

      if (Object.keys(oldValues).length > 0 || Object.keys(newValues).length > 0) {
        await recordAuditLog(request, {
          action: 'update',
          tableName: 'direct_hire_applications',
          recordId: id,
          oldValues,
          newValues,
        });
      }
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Direct hire application status checklist updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating direct hire application status checklist:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update direct hire application status checklist'
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
    // Check if application exists
    const existingApplication = await DatabaseService.getDirectHireApplicationById(id);
    if (!existingApplication) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const deleted = await DatabaseService.deleteDirectHireApplication(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete direct hire application'
      };
      return NextResponse.json(response, { status: 500 });
    }

    const before = serializeDirectHireApplication(existingApplication);
    await recordAuditLog(request, {
      action: 'delete',
      tableName: 'direct_hire_applications',
      recordId: id,
      oldValues: before,
      newValues: { deleted_at: new Date().toISOString() },
    });

    // Create notification for applicant if application belongs to one
    if ((existingApplication as any).applicant_user_id) {
      try {
        const { NotificationService } = await import('@/lib/services/notification-service');
        await NotificationService.notifyApplicationDeleted(
          (existingApplication as any).applicant_user_id,
          'direct_hire',
          id,
          (existingApplication as any).control_number || undefined
        );
      } catch (error) {
        console.error('Error creating delete notification for direct hire:', error);
        // Do not fail the request if notification creation fails
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Direct hire application deleted successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting direct hire application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete direct hire application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
