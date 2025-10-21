// app/api/balik-manggagawa/clearance/[id]/permanent-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if clearance exists (including deleted ones)
    const { db } = await import('@/lib/database');
    const { rows } = await db.query('SELECT id FROM balik_manggagawa_clearance WHERE id = $1', [id]);
    
    if (rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Balik-manggagawa clearance not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Perform permanent deletion
    const deleted = await DatabaseService.permanentlyDeleteBalikManggagawaClearance(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to permanently delete balik-manggagawa clearance'
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Balik-manggagawa clearance permanently deleted successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error permanently deleting balik-manggagawa clearance:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to permanently delete balik-manggagawa clearance'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
