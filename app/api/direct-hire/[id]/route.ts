// app/api/direct-hire/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse, DirectHireApplication } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse<DirectHireApplication>>> {
  try {
    const { id } = params;

    const application = await DatabaseService.getDirectHireApplicationById(id);
    if (!application) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Get direct hire application error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse<DirectHireApplication>>> {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if application exists
    const existingApp = await DatabaseService.getDirectHireApplicationById(id);
    if (!existingApp) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 });
    }

    // Update application
    const updatedApp = await DatabaseService.updateDirectHireApplication(id, body);
    if (!updatedApp) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update application'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedApp,
      message: 'Application updated successfully'
    });

  } catch (error) {
    console.error('Update direct hire application error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = params;

    // Check if application exists
    const existingApp = await DatabaseService.getDirectHireApplicationById(id);
    if (!existingApp) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 });
    }

    // Delete application
    const deleted = await DatabaseService.deleteDirectHireApplication(id);
    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete application'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Delete direct hire application error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
