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

    const result = await DatabaseService.getJobFairMonitoring({ page, limit, search });
    
    return NextResponse.json(result);
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
