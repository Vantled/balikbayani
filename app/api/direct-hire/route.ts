// app/api/direct-hire/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse, PaginatedResponse, DirectHireApplication } from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PaginatedResponse<DirectHireApplication>>>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const sex = searchParams.get('sex') || undefined;
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;

    const filters = {
      search,
      status,
      sex,
      date_from: dateFrom ? new Date(dateFrom) : undefined,
      date_to: dateTo ? new Date(dateTo) : undefined
    };

    const pagination = { page, limit };

    const result = await DatabaseService.getDirectHireApplications(filters, pagination);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get direct hire applications error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<DirectHireApplication>>> {
  try {
    const body = await request.json();
    const { control_number, name, sex, salary, status, jobsite, position, evaluator } = body;

    // Validation
    if (!control_number || !name || !sex || !salary || !jobsite || !position) {
      return NextResponse.json({
        success: false,
        error: 'Required fields are missing'
      }, { status: 400 });
    }

    // Check if control number already exists
    const existingApp = await DatabaseService.getDirectHireApplicationById(control_number);
    if (existingApp) {
      return NextResponse.json({
        success: false,
        error: 'Control number already exists'
      }, { status: 409 });
    }

    // Create application
    const application = await DatabaseService.createDirectHireApplication({
      control_number,
      name,
      sex,
      salary: parseFloat(salary),
      status: status || 'pending',
      jobsite,
      position,
      evaluator
    });

    return NextResponse.json({
      success: true,
      data: application,
      message: 'Direct hire application created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create direct hire application error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
