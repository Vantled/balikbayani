// app/api/direct-hire/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const preview = await DatabaseService.getDirectHireControlNumberPreview();
    
    const response: ApiResponse = {
      success: true,
      data: preview
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting control number preview:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get control number preview'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
