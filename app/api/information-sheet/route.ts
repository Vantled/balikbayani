// app/api/information-sheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const rawSearch = searchParams.get('search') || '';
    let search: string | undefined = undefined;
    // Direct query params
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

    // Parse key:value tokens in the search bar similar to Direct Hire
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
          case 'worker' :
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
          case 'first':
          case 'last':
          case 'name':
            // Push into free-text to match name columns via ILIKE
            freeTextParts.push(v);
            break;
          default:
            freeTextParts.push(token);
        }
      }
      // Combine with query params - explicit query params win over parsed unless absent
      if (freeTextParts.length) search = freeTextParts.join(' ');
      purpose = purpose || parsed.purpose;
      worker_category = worker_category || parsed.worker_category;
      include_deleted = (typeof include_deleted === 'boolean') ? include_deleted : (parsed.include_deleted ?? false);
      sex = sex || parsed.sex;
      jobsite = jobsite || parsed.jobsite;
      requested_record = requested_record || parsed.requested_record;
      date_from = date_from || parsed.date_from;
      date_to = date_to || parsed.date_to;
    } else {
      // No token parsing, keep plain search
      search = undefined;
    }

    const data = await DatabaseService.getInformationSheetRecords(
      { search, purpose: purpose as any, worker_category: worker_category as any, include_deleted, include_active, sex: sex as any, jobsite, requested_record: requested_record as any, date_from: date_from as any, date_to: date_to as any },
      { page, limit }
    );

    const response: ApiResponse = { success: true, data };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching information sheet records:', error);
    const response: ApiResponse = { success: false, error: 'Failed to fetch information sheet records' };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      ...body,
      time_received: body.time_received ?? new Date(),
      time_released: body.time_released ?? new Date(),
      total_pct: body.total_pct ?? 100,
      remarks: body.remarks ?? null,
      remarks_others: body.remarks_others ?? null,
    };
    const created = await DatabaseService.createInformationSheetRecord(payload);
    const response: ApiResponse = { success: true, data: created };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to create information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}


