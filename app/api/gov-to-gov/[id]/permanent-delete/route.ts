// app/api/gov-to-gov/[id]/permanent-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await DatabaseService.deleteGovToGovApplication(id);
    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Application not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = {
      success: true,
      message: 'Application permanently deleted'
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error permanently deleting gov-to-gov application:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to permanently delete application'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
