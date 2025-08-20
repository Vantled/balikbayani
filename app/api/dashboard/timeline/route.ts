// app/api/dashboard/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10); // Default to 6 months

    const timelineData = await DatabaseService.getTimelineData(months);

    return NextResponse.json({
      success: true,
      data: timelineData
    });

  } catch (error) {
    console.error('Get timeline data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
