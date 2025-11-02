// app/api/information-sheet/[id]/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restored = await DatabaseService.restoreInformationSheetRecord(id);
    if (!restored) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = { success: true, data: restored };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error restoring information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to restore information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}


