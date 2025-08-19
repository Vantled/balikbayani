// app/api/balik-manggagawa/clearance/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const clearance = await DatabaseService.getBalikManggagawaClearanceById(id);
    
    if (!clearance) {
      const response: ApiResponse = {
        success: false,
        error: 'Clearance not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      data: clearance
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching clearance:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch clearance'
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

    // Update clearance record
    const clearance = await DatabaseService.updateBalikManggagawaClearance(id, {
      nameOfWorker,
      sex,
      employer,
      destination,
      salary: parseFloat(salary),
      clearanceType
    });

    if (!clearance) {
      const response: ApiResponse = {
        success: false,
        error: 'Clearance not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      data: clearance,
      message: 'Clearance updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating clearance:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update clearance'
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
    
    const success = await DatabaseService.deleteBalikManggagawaClearance(id);
    
    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'Clearance not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Clearance deleted successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting clearance:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete clearance'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
