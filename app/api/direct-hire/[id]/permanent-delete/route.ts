// app/api/direct-hire/[id]/permanent-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if application exists (including deleted ones)
    const { db } = await import('@/lib/database');
    const { rows } = await db.query('SELECT id FROM direct_hire_applications WHERE id = $1', [id]);
    
    if (rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Direct hire application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Perform permanent deletion
    const deleted = await DatabaseService.permanentlyDeleteDirectHireApplication(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to permanently delete direct hire application'
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Direct hire application permanently deleted successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error permanently deleting direct hire application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to permanently delete direct hire application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
