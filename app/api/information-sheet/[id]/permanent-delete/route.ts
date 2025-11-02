// app/api/information-sheet/[id]/permanent-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Permanently remove the record
    const { db } = await import('@/lib/database');
    const { rows } = await db.query('DELETE FROM information_sheet_records WHERE id = $1 RETURNING *', [id]);
    if (!rows[0]) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = { success: true, data: rows[0] };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error permanently deleting information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to permanently delete information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}


