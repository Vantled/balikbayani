// app/api/balik-manggagawa/clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const clearanceType = searchParams.get('clearanceType') || '';
    const sex = searchParams.get('sex') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const jobsite = searchParams.get('jobsite') || '';
    const position = searchParams.get('position') || '';

    const clearances = await DatabaseService.getBalikManggagawaClearances({
      page,
      limit,
      search,
      clearanceType,
      sex,
      dateFrom,
      dateTo,
      jobsite,
      position
    });

    const response: ApiResponse = {
      success: true,
      data: clearances
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching balik manggagawa clearances:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch clearances'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nameOfWorker,
      sex,
      employer,
      destination,
      salary,
      clearanceType
    } = body;

    // Validate required fields
    if (!nameOfWorker || !sex || !employer || !destination || !salary || !clearanceType) {
      const response: ApiResponse = {
        success: false,
        error: 'All fields are required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate sex
    if (!['male', 'female'].includes(sex)) {
      const response: ApiResponse = {
        success: false,
        error: 'Sex must be either male or female'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate clearance type
    const validClearanceTypes = [
      'watchlisted_employer',
      'seafarer_position', 
      'non_compliant_country',
      'no_verified_contract',
      'for_assessment_country',
      'critical_skill',
      'watchlisted_similar_name'
    ];

    if (!validClearanceTypes.includes(clearanceType)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid clearance type'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create clearance record
    const clearance = await DatabaseService.createBalikManggagawaClearance({
      nameOfWorker,
      sex,
      employer,
      destination,
      salary: parseFloat(salary),
      clearanceType
    });

    const response: ApiResponse = {
      success: true,
      data: clearance,
      message: 'Clearance created successfully'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating balik manggagawa clearance:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create clearance'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
