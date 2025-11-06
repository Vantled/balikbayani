// app/api/information-sheet/export/route.ts
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
    let search: string | undefined = undefined;
    let purpose = searchParams.get('purpose') || undefined;
    let worker_category = searchParams.get('worker_category') || undefined;
    let include_deleted = searchParams.get('include_deleted') === 'true';
    let sex = searchParams.get('sex') || undefined;
    const genderParam = searchParams.get('gender') || undefined;
    if (!sex && genderParam) sex = genderParam;
    let jobsite = searchParams.get('jobsite') || undefined;
    let requested_record = searchParams.get('requested_record') || undefined;
    let date_from = searchParams.get('date_from') || undefined;
    let date_to = searchParams.get('date_to') || undefined;
    const include_active = searchParams.get('include_active') === 'false' ? false : true;

    // Parse key:value tokens in the search bar
    if (rawSearch) {
      const parsed: any = {};
      const freeTextParts: string[] = [];
      const tokens = rawSearch.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const [k, ...rest] = token.split(':');
        if (!rest.length) { freeTextParts.push(token); continue; }
        const v = rest.join(':');
        switch (k.toLowerCase()) {
          case 'sex':
          case 'gender':
            if (v.toLowerCase() === 'male' || v.toLowerCase() === 'female') parsed.sex = v.toLowerCase();
            break;
          case 'jobsite':
            parsed.jobsite = v;
            break;
          case 'purpose':
            parsed.purpose = v.toLowerCase().replace(/\s+/g, '_');
            break;
          case 'worker':
          case 'worker_category':
            parsed.worker_category = v.toLowerCase().replace(/\s+/g, '_');
            break;
          case 'requested':
          case 'requested_record':
            parsed.requested_record = v.toLowerCase().replace(/\s+/g, '_');
            break;
          case 'date':
          case 'date_range': {
            const [from, to] = v.split('|');
            if (from) parsed.date_from = from;
            if (to) parsed.date_to = to;
            break;
          }
          case 'include_deleted':
          case 'deleted':
            if (v === 'true') parsed.include_deleted = true; if (v === 'false') parsed.include_deleted = false;
            break;
          case 'include_active':
          case 'active':
            parsed.include_active = (v !== 'false');
            break;
          default:
            freeTextParts.push(token);
        }
      }
      if (freeTextParts.length) search = freeTextParts.join(' ');
      purpose = purpose || parsed.purpose;
      worker_category = worker_category || parsed.worker_category;
      include_deleted = (typeof include_deleted === 'boolean') ? include_deleted : (parsed.include_deleted ?? false);
      sex = sex || parsed.sex;
      jobsite = jobsite || parsed.jobsite;
      requested_record = requested_record || parsed.requested_record;
      date_from = date_from || parsed.date_from;
      date_to = date_to || parsed.date_to;
    }

    // Get all data for export (no pagination)
    const result = await DatabaseService.getInformationSheetRecords(
      { search, purpose: purpose as any, worker_category: worker_category as any, include_deleted, include_active, sex: sex as any, jobsite, requested_record: requested_record as any, date_from: date_from as any, date_to: date_to as any },
      { page: 1, limit: 10000 }
    );

    // Format purpose for display
    const formatPurpose = (purpose: string): string => {
      const purposeMap: Record<string, string> = {
        'employment': 'Employment',
        'owwa': 'OWWA',
        'legal': 'Legal',
        'loan': 'Loan',
        'visa': 'Visa',
        'balik_manggagawa': 'Balik Manggagawa',
        'reduced_travel_tax': 'Reduced Travel Tax',
        'philhealth': 'PhilHealth',
        'others': 'Others'
      };
      return purposeMap[purpose] || purpose;
    };

    // Format worker category for display
    const formatWorkerCategory = (category: string): string => {
      const categoryMap: Record<string, string> = {
        'landbased_newhire': 'Landbased New Hire',
        'rehire_balik_manggagawa': 'Rehire/Balik Manggagawa',
        'seafarer': 'Seafarer'
      };
      return categoryMap[category] || category;
    };

    // Format requested record for display
    const formatRequestedRecord = (record: string): string => {
      const recordMap: Record<string, string> = {
        'information_sheet': 'Information Sheet',
        'oec': 'OEC',
        'employment_contract': 'Employment Contract'
      };
      return recordMap[record] || record;
    };

    // Format documents presented array
    const formatDocumentsPresented = (documents: string[]): string => {
      if (!documents || documents.length === 0) return '';
      return documents.join(', ');
    };

    // Transform data for Excel export - map to template column headers
    const excelData = result.data.map(record => ({
      family_name: record.family_name || '',
      first_name: record.first_name || '',
      middle_name: record.middle_name || '',
      gender: record.gender ? (record.gender === 'male' ? 'Male' : 'Female') : '',
      jobsite: record.jobsite || '',
      name_of_agency: record.name_of_agency || '',
      purpose: formatPurpose(record.purpose),
      specify_if_others: record.purpose_others || '',
      worker_category: formatWorkerCategory(record.worker_category),
      specify_if_regional_office_polo: record.documents_others || '',
      requested_record: formatRequestedRecord(record.requested_record),
      documents_presented: formatDocumentsPresented(record.documents_presented || []),
    }));

    // Export to Excel using template
    // Row 1-13: Headers and other content, Row 14: Template with placeholders, Row 15+: Data
    const excelBuffer = await exportToExcel({
      templateName: 'information sheet.xlsx',
      data: excelData,
      startRow: 14, // Row 14 is the template row with placeholders
      sheetName: 'DATE', // Use the DATE sheet
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="information-sheet.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting information sheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to export information sheet data';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

