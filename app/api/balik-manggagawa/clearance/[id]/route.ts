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
      rawSalary,
      salaryCurrency,
      jobType,
      clearanceType,
      position,
      monthsYears,
      withPrincipal,
      newPrincipalName,
      employmentDuration,
      dateArrival,
      dateDeparture,
      placeDateEmployment,
      dateBlacklisting,
      totalDeployedOfws,
      reasonBlacklisting,
      yearsWithPrincipal,
      remarks
    } = body;

    // Validate required fields (allow missing clearanceType)
    if (!nameOfWorker || !sex || !employer || !destination || !salary) {
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

    // If provided, validate clearance type
    const validClearanceTypes = [
      'watchlisted_employer',
      'seafarer_position', 
      'non_compliant_country',
      'no_verified_contract',
      'for_assessment_country',
      'critical_skill',
      'watchlisted_similar_name'
    ];

    if (clearanceType && !validClearanceTypes.includes(clearanceType)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid clearance type'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update clearance record
    const normalize = (v: any) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) ? null : v;
    const clearance = await DatabaseService.updateBalikManggagawaClearance(id, {
      nameOfWorker,
      sex,
      employer,
      destination,
      salary: parseFloat(salary),
      rawSalary: rawSalary ? parseFloat(rawSalary) : parseFloat(salary),
      salaryCurrency: salaryCurrency || null,
      jobType: jobType || null,
      clearanceType: clearanceType ?? null,
      position: normalize(position),
      monthsYears: normalize(monthsYears),
      withPrincipal: normalize(withPrincipal),
      newPrincipalName: normalize(newPrincipalName),
      employmentDuration: normalize(employmentDuration),
      dateArrival: normalize(dateArrival),
      dateDeparture: normalize(dateDeparture),
      placeDateEmployment: normalize(placeDateEmployment),
      dateBlacklisting: normalize(dateBlacklisting),
      totalDeployedOfws: totalDeployedOfws != null && String(totalDeployedOfws).trim() !== '' ? Number(totalDeployedOfws) : null,
      reasonBlacklisting: normalize(reasonBlacklisting),
      yearsWithPrincipal: yearsWithPrincipal != null && String(yearsWithPrincipal).trim() !== '' ? Number(yearsWithPrincipal) : null,
      remarks: normalize(remarks)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body && body.action === 'restore') {
      const success = await DatabaseService.restoreBalikManggagawaClearance(id);
      if (!success) {
        const response: ApiResponse = { success: false, error: 'Clearance not found' };
        return NextResponse.json(response, { status: 404 });
      }
      const response: ApiResponse = { success: true, message: 'Clearance restored successfully' };
      return NextResponse.json(response);
    }
    // Lightweight status + clearance type update to support inline table controls
    if (body && body.action === 'status_update') {
      const { status, clearanceType, metadata } = body as { status?: string; clearanceType?: string | null; metadata?: Record<string, any> };
      // Validate status if provided
      const validStatuses = ['for_clearance', 'for_approval', 'finished', 'rejected', 'approved'];
      if (status && !validStatuses.includes(status)) {
        const response: ApiResponse = { success: false, error: 'Invalid status' };
        return NextResponse.json(response, { status: 400 });
      }

      // Validate clearance type if provided
      const validClearanceTypes = [
        'watchlisted_employer',
        'seafarer_position',
        'non_compliant_country',
        'no_verified_contract',
        'for_assessment_country',
        'critical_skill',
        'watchlisted_similar_name'
      ];
      if (clearanceType !== undefined && clearanceType !== null && clearanceType !== '' && !validClearanceTypes.includes(clearanceType)) {
        const response: ApiResponse = { success: false, error: 'Invalid clearance type' };
        return NextResponse.json(response, { status: 400 });
      }

      // If metadata for template fields was provided, persist relevant fields on the clearance record
      const updated = await DatabaseService.updateBalikManggagawaStatus(id, {
        status: status ?? null,
        clearanceType: clearanceType ?? null,
        newPrincipalName: (metadata as any)?.new_principal_name ?? undefined,
        employmentDuration: (metadata as any)?.employment_duration ?? undefined,
        dateArrival: (metadata as any)?.date_arrival ?? undefined,
        dateDeparture: (metadata as any)?.date_departure ?? undefined,
        remarks: (metadata as any)?.remarks ?? undefined,
        monthsYears: (metadata as any)?.months_years ?? undefined,
        employmentStartDate: (metadata as any)?.employment_start_date ?? undefined,
        processingDate: (metadata as any)?.processing_date ?? undefined,
        placeDateEmployment: (metadata as any)?.place_date_employment ?? undefined,
        totalDeployedOfws: (metadata as any)?.total_deployed_ofws ?? undefined,
        dateBlacklisting: (metadata as any)?.date_blacklisting ?? undefined,
        reasonBlacklisting: (metadata as any)?.reason_blacklisting ?? undefined,
        yearsWithPrincipal: (metadata as any)?.years_with_principal ?? undefined,
        activeEmailAddress: (metadata as any)?.active_email_address ?? undefined,
        activePhMobileNumber: (metadata as any)?.active_ph_mobile_number ?? undefined,
      });
      if (!updated) {
        const response: ApiResponse = { success: false, error: 'Clearance not found' };
        return NextResponse.json(response, { status: 404 });
      }
      const response: ApiResponse = { success: true, data: updated, message: 'Status updated successfully' };
      return NextResponse.json(response);
    }

    const response: ApiResponse = { success: false, error: 'Invalid action' };
    return NextResponse.json(response, { status: 400 });
  } catch (error) {
    console.error('Error restoring clearance:', error);
    const response: ApiResponse = { success: false, error: 'Failed to restore clearance' };
    return NextResponse.json(response, { status: 500 });
  }
}
