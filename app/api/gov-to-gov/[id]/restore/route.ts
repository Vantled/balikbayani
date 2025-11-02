// app/api/gov-to-gov/[id]/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restored = await DatabaseService.restoreGovToGovApplication(id);
    if (!restored) {
      const response: ApiResponse = {
        success: false,
        error: 'Application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = {
      success: true,
      data: restored,
      message: 'Application restored successfully'
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error restoring gov-to-gov application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
