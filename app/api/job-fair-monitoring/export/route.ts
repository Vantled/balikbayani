// app/api/job-fair-monitoring/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';

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
    const format = searchParams.get('format') || 'excel';
    const search = searchParams.get('search') || '';

    // Get all data for export (no pagination)
    const result = await DatabaseService.getJobFairMonitoring({ 
      page: 1, 
      limit: 1000, // Large limit to get all data
      search 
    });

    if (format === 'csv') {
      const csvData = generateCSV(result.data);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="job-fair-monitoring.csv"',
        },
      });
    } else {
      // Default to JSON format
      return NextResponse.json({
        data: result.data,
        exportDate: new Date().toISOString(),
        totalRecords: result.data.length
      });
    }
  } catch (error) {
    console.error('Error exporting job fair monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to export job fair monitoring data' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]): string {
  const headers = [
    'Date of Job Fair',
    'Venue',
    'No. of Invited Agencies',
    'No. of Agencies with JFA',
    'Male Applicants',
    'Female Applicants',
    'Total Applicants',
    'Created At',
    'Updated At'
  ];

  const csvRows = [headers.join(',')];

  for (const record of data) {
    const row = [
      formatDate(record.date_of_job_fair),
      `"${record.venue}"`,
      record.no_of_invited_agencies,
      record.no_of_agencies_with_jfa,
      record.male_applicants,
      record.female_applicants,
      record.total_applicants,
      formatDate(record.created_at),
      formatDate(record.updated_at)
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}
