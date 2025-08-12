// app/api/direct-hire/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const application = await DatabaseService.getDirectHireApplicationById(params.id);

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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Check if application exists
    const existingApplication = await DatabaseService.getDirectHireApplicationById(params.id);
    if (!existingApplication) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.sex) updateData.sex = body.sex;
    if (body.salary) updateData.salary = parseFloat(body.salary);
    if (body.status) updateData.status = body.status;
    if (body.jobsite) updateData.jobsite = body.jobsite;
    if (body.position) updateData.position = body.position;
    if (body.evaluator !== undefined) updateData.evaluator = body.evaluator;

    const result = await DatabaseService.updateDirectHireApplication(params.id, updateData);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if application exists
    const existingApplication = await DatabaseService.getDirectHireApplicationById(params.id);
    if (!existingApplication) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const deleted = await DatabaseService.deleteDirectHireApplication(params.id);

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
