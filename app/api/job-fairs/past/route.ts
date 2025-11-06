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
    
    // Format dates as strings to avoid timezone issues when serializing to JSON
    const formattedData = result.data.map(jobFair => {
      const date = jobFair.date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      return {
        ...jobFair,
        date: dateStr // Return as string to avoid timezone shifts
      };
    });
    
    return NextResponse.json({
      ...result,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching past job fairs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch past job fairs data' },
      { status: 500 }
    );
  }
}
