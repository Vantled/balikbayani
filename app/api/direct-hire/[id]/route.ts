// app/api/direct-hire/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

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
    if (body.evaluator !== undefined) updateData.evaluator = String(body.evaluator || '').toUpperCase();
    if (body.employer !== undefined) updateData.employer = String(body.employer || '').toUpperCase();

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
