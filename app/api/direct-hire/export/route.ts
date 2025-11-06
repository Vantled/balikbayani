// app/api/direct-hire/export/route.ts
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
    const rawSearch = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',') : undefined;
    const sex = searchParams.get('sex') || undefined;
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    const includeFinished = searchParams.get('include_finished') === 'true';
    const includeProcessing = searchParams.get('include_processing') === 'true';

    // Parse key:value terms from search bar
    const parsed: any = {};
    const freeTextParts: string[] = [];
    if (rawSearch) {
      const tokens = rawSearch.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const [k, ...rest] = token.split(':');
        if (!rest.length) { freeTextParts.push(token); continue; }
        const v = rest.join(':');
        switch (k.toLowerCase()) {
          case 'sex':
            if (v.toLowerCase() === 'male' || v.toLowerCase() === 'female') parsed.sex = v.toLowerCase();
            break;
          case 'jobsite':
            parsed.jobsite = v;
            break;
          case 'position':
            parsed.position = v;
            break;
          case 'evaluator':
            parsed.evaluator = v;
            break;
          case 'control':
          case 'control_number':
            parsed.control_number = v;
            break;
          case 'date':
          case 'date_range': {
            const [from, to] = v.split('|');
            if (from) parsed.date_from = from;
            if (to) parsed.date_to = to;
            break;
          }
          default:
            freeTextParts.push(token);
        }
      }
    }
    const search = freeTextParts.length ? freeTextParts.join(' ') : undefined;

    const filters: any = {
      search,
      status,
      sex: (parsed.sex || sex) as 'male' | 'female' | undefined,
      include_deleted: includeDeleted,
      include_finished: includeFinished,
      include_processing: includeProcessing
    };
    if (parsed.jobsite) filters.jobsite = parsed.jobsite;
    if (parsed.position) filters.position = parsed.position;
    if (parsed.evaluator) filters.evaluator = parsed.evaluator;
    if (parsed.control_number) filters.control_number = parsed.control_number;
    if (parsed.date_from) filters.date_from = parsed.date_from;
    if (parsed.date_to) filters.date_to = parsed.date_to;

    // Get all data for export (no pagination)
    const result = await DatabaseService.getDirectHireApplications(filters, { page: 1, limit: 10000 });

    // Format date/time for Excel (e.g., "Feb 10, 2025 10:34 AM")
    const formatDateTime = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return '';
      }
    };

    // Format date for Excel (e.g., "FEB 15, 2025")
    const formatDateShort = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }).toUpperCase();
      } catch {
        return '';
      }
    };

    // Format date for Excel (e.g., "02/23/2025 12:00 AM")
    const formatDateWithTime = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return '';
      }
    };

    // Format confirmation with metadata if available
    const formatConfirmation = (record: any): string => {
      const checklist = record.status_checklist || {};
      const confirmation = checklist.for_confirmation || {};
      
      if (confirmation.checked && confirmation.timestamp) {
        const meta = checklist.for_confirmation_meta || {};
        if (meta.verified_date) {
          return `CONFIRMED ${formatDateShort(meta.verified_date)}`;
        }
        return formatDateShort(confirmation.timestamp);
      }
      return '';
    };

    // Transform data for Excel export - map to template column names
    const excelData = result.data.map((record, index) => ({
      no: index + 1,
      control_no: record.control_number || '',
      name: record.name || '',
      jobsite: record.jobsite || '',
      evaluated: formatDateTime(record.status_checklist?.evaluated?.timestamp),
      for_confirmation_mwo_pe_pcg: formatConfirmation(record),
      emailed_to_dhad: formatDateShort(record.status_checklist?.emailed_to_dhad?.timestamp),
      received_from_dhad: formatDateWithTime(record.status_checklist?.received_from_dhad?.timestamp),
      evaluator: record.evaluator || '',
      note: '', // Empty by default, can be populated if there's a notes field
    }));

    // Export to Excel using template
    // Row 1: Title, Row 2: Headers, Row 3: Template with placeholders, Row 4+: Data
    const excelBuffer = await exportToExcel({
      templateName: 'direct hire.xlsx',
      data: excelData,
      startRow: 3, // Row 3 is the template row with placeholders
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="direct-hire.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting direct hire:', error);
    return NextResponse.json(
      { error: 'Failed to export direct hire data' },
      { status: 500 }
    );
  }
}

