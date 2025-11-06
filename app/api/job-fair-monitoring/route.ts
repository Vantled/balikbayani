// app/api/job-fair-monitoring/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || '';
    const showDeletedOnly = searchParams.get('showDeletedOnly') === 'true';

    const result = await DatabaseService.getJobFairMonitoring({ page, limit, search, filter, showDeletedOnly });
    
    // Format dates as strings to avoid timezone issues when serializing to JSON
    const formattedData = result.data.map(record => {
      const date = record.date_of_job_fair;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      return {
        ...record,
        date_of_job_fair: dateStr // Return as string to avoid timezone shifts
      };
    });
    
    return NextResponse.json({
      ...result,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching job fair monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job fair monitoring data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const {
      date_of_job_fair,
      venue,
      no_of_invited_agencies,
      no_of_agencies_with_jfa,
      male_applicants,
      female_applicants,
      total_applicants,
      dmw_staff_assigned
    } = body;

    // Validate required fields
    if (!date_of_job_fair || !venue || no_of_invited_agencies === undefined || 
        no_of_agencies_with_jfa === undefined || male_applicants === undefined || 
        female_applicants === undefined || total_applicants === undefined) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const monitoringData = {
      date_of_job_fair: new Date(date_of_job_fair),
      venue,
      no_of_invited_agencies: parseInt(no_of_invited_agencies),
      no_of_agencies_with_jfa: parseInt(no_of_agencies_with_jfa),
      male_applicants: parseInt(male_applicants),
      female_applicants: parseInt(female_applicants),
      total_applicants: parseInt(total_applicants),
      dmw_staff_assigned: dmw_staff_assigned || null
    };

    const result = await DatabaseService.createJobFairMonitoring(monitoringData);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating job fair monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to create job fair monitoring record' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('bb_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { action, id } = body;

    if (!action || !id) {
      return NextResponse.json(
        { error: 'Action and ID are required' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'restore':
        result = await DatabaseService.restoreJobFairMonitoring(id);
        break;
      case 'permanent-delete':
        result = await DatabaseService.permanentDeleteJobFairMonitoring(id);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error performing action on job fair monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to perform action on job fair monitoring record' },
      { status: 500 }
    );
  }
}
