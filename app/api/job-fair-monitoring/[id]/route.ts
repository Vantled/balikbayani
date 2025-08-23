// app/api/job-fair-monitoring/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await DatabaseService.getJobFairMonitoringById(params.id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Job fair monitoring record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching job fair monitoring record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job fair monitoring record' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      total_applicants
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
      total_applicants: parseInt(total_applicants)
    };

    const result = await DatabaseService.updateJobFairMonitoring(params.id, monitoringData);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Job fair monitoring record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating job fair monitoring record:', error);
    return NextResponse.json(
      { error: 'Failed to update job fair monitoring record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await DatabaseService.deleteJobFairMonitoring(params.id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Job fair monitoring record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Job fair monitoring record deleted successfully' });
  } catch (error) {
    console.error('Error deleting job fair monitoring record:', error);
    return NextResponse.json(
      { error: 'Failed to delete job fair monitoring record' },
      { status: 500 }
    );
  }
}
