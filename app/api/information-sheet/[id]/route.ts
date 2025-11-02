// app/api/information-sheet/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await DatabaseService.getInformationSheetRecordById(id);
    if (!data) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = { success: true, data };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to fetch information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await DatabaseService.updateInformationSheetRecord(id, body);
    if (!updated) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = { success: true, data: updated };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to update information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await DatabaseService.softDeleteInformationSheetRecord(id);
    if (!deleted) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    const response: ApiResponse = { success: true, data: deleted };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to delete information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}


