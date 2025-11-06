// app/api/peso-contacts/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { AuthService } from '@/lib/services/auth-service';
import ExcelJS from 'exceljs';

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

    // Get all contacts (no pagination for export)
    const response = await DatabaseService.getPesoContacts({ 
      page: 1, 
      limit: 10000,
      search 
    });

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('PESO Contacts');

    // Define headers
    const headers = [
      'Province',
      'PESO Office',
      'Office Head',
      'Email Address(es)',
      'Contact Number(s)'
    ];

    // Set header row with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Style header cells
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    response.data.forEach((contact) => {
      const emails = contact.emails && contact.emails.length > 0
        ? contact.emails.map((email: any) => email.email_address).join('; ')
        : (contact.email || 'No emails');
      
      const contacts = contact.contacts && contact.contacts.length > 0
        ? contact.contacts.map((contactInfo: any) => `${contactInfo.contact_category}: ${contactInfo.contact_number}`).join('; ')
        : (contact.contact_number || 'No contacts');

      const row = worksheet.addRow([
        contact.province || '',
        contact.peso_office || '',
        contact.office_head || '',
        emails,
        contacts
      ]);

      // Style data rows
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value ? String(cell.value) : '';
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="peso-contacts.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting PESO contacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to export PESO contacts';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
