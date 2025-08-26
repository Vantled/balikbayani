// app/api/job-fairs/past/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    // Get past job fairs (date is in the past)
    const result = await DatabaseService.getPastJobFairs({ page, limit, search });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching past job fairs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch past job fairs data' },
      { status: 500 }
    );
  }
}
