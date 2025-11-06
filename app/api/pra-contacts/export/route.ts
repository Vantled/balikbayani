// app/api/pra-contacts/export/route.ts
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
    const showDeletedOnly = searchParams.get('showDeletedOnly') === 'true';

    // Get all data for export (no pagination)
    const result = await DatabaseService.getPraContacts({ 
      page: 1, 
      limit: 10000,
      search,
      showDeletedOnly
    });

    // Transform data for Excel export
    const excelData = result.data.map(contact => ({
      name_of_pras: contact.name_of_pras || '',
      pra_contact_person: contact.pra_contact_person || '',
      office_head: contact.office_head || '',
      email: contact.email || '',
      contact_number: contact.contact_number || '',
      emails: contact.emails && contact.emails.length > 0 
        ? contact.emails.map((e: any) => e.email_address).join('; ')
        : '',
      contacts: contact.contacts && contact.contacts.length > 0
        ? contact.contacts.map((c: any) => `${c.contact_category}: ${c.contact_number}`).join('; ')
        : '',
      created_at: contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '',
      updated_at: contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : '',
    }));

    // Export to Excel using template
    const excelBuffer = await exportToExcel({
      templateName: 'pra contacts.xlsx',
      data: excelData,
      startRow: 2,
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="pra-contacts.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting PRA contacts:', error);
    return NextResponse.json(
      { error: 'Failed to export PRA contacts data' },
      { status: 500 }
    );
  }
}

