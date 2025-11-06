// app/api/job-fair-monitoring/export/route.ts
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

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Fair Monitoring');

    // Define headers
    const headers = [
      'Date of Job Fair',
      'Venue',
      'Male(Applicants)',
      'Female(Applicants)',
      'Total(Applicants)',
      'DMW Staff Assigned'
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

    // Format date helper
    const formatDate = (date: Date | string | null | undefined): string => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Add data rows
    result.data.forEach((record) => {
      const row = worksheet.addRow([
        formatDate(record.date_of_job_fair),
        record.venue || '',
        record.male_applicants || 0,
        record.female_applicants || 0,
        record.total_applicants || 0,
        record.dmw_staff_assigned || ''
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
        'Content-Disposition': 'attachment; filename="job-fair-monitoring.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting job fair monitoring:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to export job fair monitoring';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
