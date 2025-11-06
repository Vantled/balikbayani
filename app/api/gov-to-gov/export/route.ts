// app/api/gov-to-gov/export/route.ts
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
    const search = searchParams.get('search') || undefined;
    const sex = searchParams.get('sex') as any || undefined;
    const educational_attainment = searchParams.get('educational_attainment') || undefined;
    const with_taiwan_work_experience = searchParams.get('with_taiwan_work_experience') === 'true' ? true : searchParams.get('with_taiwan_work_experience') === 'false' ? false : undefined;
    const date_from = searchParams.get('date_from') || undefined;
    const date_to = searchParams.get('date_to') || undefined;
    const include_deleted = searchParams.get('include_deleted') === 'true' ? true : searchParams.get('include_deleted') === 'false' ? false : undefined;
    const include_active = searchParams.get('include_active') === 'false' ? false : undefined;

    // Get all data for export (no pagination)
    const result = await DatabaseService.getGovToGovApplications({ 
      search, 
      sex, 
      educational_attainment,
      with_taiwan_work_experience,
      date_from,
      date_to,
      include_deleted,
      include_active
    }, { page: 1, limit: 10000 });

    // Format date as mm/dd/yyyy
    const formatDate = (dateString: string | Date | null | undefined): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      } catch {
        return '';
      }
    };

    // Calculate age from date of birth
    const calculateAge = (dateOfBirth: string | Date | null | undefined): number => {
      if (!dateOfBirth) return 0;
      try {
        const birthDate = new Date(dateOfBirth);
        if (isNaN(birthDate.getTime())) return 0;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      } catch {
        return 0;
      }
    };

    // Format work experience details
    const formatWorkExperience = (company: string | null | undefined, yearStarted: number | null | undefined, yearEnded: number | null | undefined): string => {
      if (!company) return '';
      const startYear = yearStarted ? String(yearStarted) : '';
      const endYear = yearEnded ? String(yearEnded) : '';
      if (startYear && endYear) {
        return `${company} (${startYear} - ${endYear})`;
      } else if (startYear) {
        return `${company} (${startYear})`;
      }
      return company;
    };

    // Transform data for Excel export - map to column headers
    const excelData = result.data.map(record => ({
      last_name: record.last_name || '',
      first_name: record.first_name || '',
      middle_name: record.middle_name || '',
      sex: record.sex ? (record.sex === 'male' ? 'Male' : 'Female') : '',
      date_of_birth: formatDate(record.date_of_birth),
      age: calculateAge(record.date_of_birth),
      height: record.height ? `${record.height} CM` : '',
      weight: record.weight ? `${record.weight} KG` : '',
      educational_attainment: record.educational_attainment || '',
      present_address: record.present_address || '',
      email_address: record.email_address || '',
      contact_number: record.contact_number || '',
      passport_number: record.passport_number || '',
      passport_validity: formatDate(record.passport_validity),
      id_presented: record.id_presented || '',
      id_number: record.id_number || '',
      with_taiwan_work_experience: record.with_taiwan_work_experience ? 'Yes' : 'No',
      taiwan_work_experience: formatWorkExperience(
        (record as any).taiwan_company,
        (record as any).taiwan_year_started,
        (record as any).taiwan_year_ended
      ),
      with_job_experience: record.with_job_experience ? 'Yes' : 'No',
      name_of_company_with_year: formatWorkExperience(
        (record as any).other_company,
        (record as any).other_year_started,
        (record as any).other_year_ended
      ),
      remarks: record.remarks || '',
      date_received_by_region: formatDate((record as any).date_received_by_region || record.created_at),
    }));

    // Export to Excel using template
    // Row 1: Title, Row 2: Template with placeholders, Row 3+: Data
    const excelBuffer = await exportToExcel({
      templateName: 'gov to gov.xlsx',
      data: excelData,
      startRow: 2, // Row 2 is the template row with placeholders
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="gov-to-gov.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting gov-to-gov:', error);
    return NextResponse.json(
      { error: 'Failed to export gov-to-gov data' },
      { status: 500 }
    );
  }
}

