// app/api/job-fair-monitoring/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';
import { exportToExcel } from '@/lib/excel-export-service';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || '';
    const showDeletedOnly = searchParams.get('showDeletedOnly') === 'true';

    // Get all data for export (no pagination)
    const result = await DatabaseService.getJobFairMonitoring({ 
      page: 1, 
      limit: 10000,
      search,
      filter,
      showDeletedOnly
    });

    // Transform data for Excel export
    const excelData = result.data.map(record => ({
      date_of_job_fair: record.date_of_job_fair ? new Date(record.date_of_job_fair).toLocaleDateString() : '',
      venue: record.venue || '',
      no_of_invited_agencies: record.no_of_invited_agencies || 0,
      no_of_agencies_with_jfa: record.no_of_agencies_with_jfa || 0,
      male_applicants: record.male_applicants || 0,
      female_applicants: record.female_applicants || 0,
      total_applicants: record.total_applicants || 0,
      dmw_staff_assigned: record.dmw_staff_assigned || '',
      created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : '',
    }));

    // Export to Excel using template
    const excelBuffer = await exportToExcel({
      templateName: 'job fair monitoring.xlsx',
      data: excelData,
      startRow: 2,
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="job-fair-monitoring.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting job fair monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to export job fair monitoring data' },
      { status: 500 }
    );
  }
}
