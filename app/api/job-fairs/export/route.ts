// app/api/job-fairs/export/route.ts
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
    const showDeletedOnly = searchParams.get('showDeletedOnly') === 'true';

    // Get all data for export (no pagination)
    const result = await DatabaseService.getJobFairs({ 
      page: 1, 
      limit: 1000, // Large limit to get all data
      search,
      showDeletedOnly
    });

    if (format === 'csv') {
      const csvData = generateCSV(result.data);
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="job-fairs.csv"',
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
    console.error('Error exporting job fairs:', error);
    return NextResponse.json(
      { error: 'Failed to export job fairs data' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]): string {
  const headers = [
    'Date',
    'Venue',
    'Office Head',
    'Email Addresses',
    'Contact Numbers',
    'Rescheduled',
    'Created At',
    'Updated At'
  ];

  const csvRows = [headers.join(',')];

  for (const record of data) {
    // Format email addresses
    const emailAddresses = record.emails && record.emails.length > 0 
      ? record.emails.map((email: any) => email.email_address).join('; ')
      : 'No emails';
    
    // Format contact numbers
    const contactNumbers = record.contacts && record.contacts.length > 0 
      ? record.contacts.map((contact: any) => `${contact.contact_category}: ${contact.contact_number}`).join('; ')
      : 'No contacts';
    
    const row = [
      formatDate(record.date),
      `"${record.venue}"`,
      `"${record.office_head}"`,
      `"${emailAddresses}"`,
      `"${contactNumbers}"`,
      record.is_rescheduled ? 'Yes' : 'No',
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
