// app/api/direct-hire/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const sex = searchParams.get('sex') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const filters = {
      search,
      status,
      sex: sex as 'male' | 'female' | undefined
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
      sex: body.sex,
      salary: parseFloat(body.salary),
      status: body.status || 'pending',
      jobsite: body.jobsite,
      position: body.position,
      evaluator: body.evaluator || ''
    };

    const result = await DatabaseService.createDirectHireApplication(applicationData);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Direct hire application created successfully'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating direct hire application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create direct hire application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
