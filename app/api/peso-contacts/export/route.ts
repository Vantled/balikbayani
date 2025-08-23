// app/api/peso-contacts/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const search = searchParams.get('search') || '';

    // Get all contacts (no pagination for export)
    const response = await DatabaseService.getPesoContacts({ 
      page: 1, 
      limit: 1000, // Large limit to get all data
      search 
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['Province', 'PESO Office', 'Office Head', 'Email', 'Contact Number', 'Created At', 'Updated At'];
      const csvRows = response.data.map(contact => [
        contact.province,
        contact.peso_office,
        contact.office_head,
        contact.email,
        contact.contact_number,
        new Date(contact.created_at).toLocaleDateString(),
        new Date(contact.updated_at).toLocaleDateString()
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="peso-contacts.csv"'
        }
      });
    } else {
      // Return JSON format
      return NextResponse.json(response.data);
    }
  } catch (error) {
    console.error('Error exporting PESO contacts:', error);
    return NextResponse.json(
      { error: 'Failed to export PESO contacts' },
      { status: 500 }
    );
  }
}
