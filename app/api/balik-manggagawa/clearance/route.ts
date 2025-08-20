// app/api/balik-manggagawa/clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import AuthService from '@/lib/services/auth-service';
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
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const showDeletedOnly = searchParams.get('showDeletedOnly') === 'true';

    const clearances = await DatabaseService.getBalikManggagawaClearances({
      page,
      limit,
      search,
      clearanceType,
      sex,
      dateFrom,
      dateTo,
      jobsite,
      position,
      include_deleted: includeDeleted,
      show_deleted_only: showDeletedOnly
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
      clearanceType,
      // Extended fields
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
      employmentStartDate,
      processingDate,
      remarks,
      // New template fields
      noOfMonthsYears,
      dateOfDeparture,
      // Watchlisted OFW contact fields
      activeEmailAddress,
      activePhMobileNumber,
      evaluator
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

    // Resolve evaluator from current session (full name of logged-in staff)
    let evaluatorFromSession: string | null = null;
    try {
      const token = request.cookies.get('bb_auth_token')?.value;
      if (token) {
        const user = await AuthService.validateSession(token);
        if (user && (user as any).full_name) {
          evaluatorFromSession = (user as any).full_name;
        }
      }
    } catch {}

    // Create clearance record
    const normalize = (v: any) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) ? null : v;
    const clearance = await DatabaseService.createBalikManggagawaClearance({
      nameOfWorker,
      sex,
      employer,
      destination,
      salary: parseFloat(salary),
      clearanceType,
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
      employmentStartDate: normalize(employmentStartDate),
      processingDate: normalize(processingDate),
      remarks: normalize(remarks),
      noOfMonthsYears: normalize(noOfMonthsYears),
      dateOfDeparture: normalize(dateOfDeparture),
      activeEmailAddress: normalize(activeEmailAddress),
      activePhMobileNumber: normalize(activePhMobileNumber),
      evaluator: evaluatorFromSession || normalize(evaluator)
    });

    // For types requiring processing, also create a processing record
    if (clearanceType === 'for_assessment_country' || clearanceType === 'non_compliant_country' || clearanceType === 'watchlisted_similar_name') {
      try {
        await DatabaseService.createBalikManggagawaProcessing({
          nameOfWorker,
          sex,
          address: '', // Will be filled later when applicant provides address
          destination,
          clearanceType,
          clearanceId: clearance.id
        });
      } catch (processingError) {
        console.error('Failed to create processing record for BM type requiring processing:', processingError);
        // Don't fail the clearance creation if processing record creation fails
      }
    }

    const response: ApiResponse = {
      success: true,
      data: clearance,
      message: 'Clearance created successfully'
    };

    // Auto-generate document after creation (best-effort)
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL
      const url = base ? `${base}/api/balik-manggagawa/clearance/${clearance.id}/generate` : `${request.nextUrl.origin}/api/balik-manggagawa/clearance/${clearance.id}/generate`
      await fetch(url, { method: 'POST' }).catch(() => {})
    } catch {}

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
