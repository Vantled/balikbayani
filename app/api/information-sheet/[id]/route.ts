// app/api/information-sheet/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database-service';
import { ApiResponse } from '@/lib/types';
import { recordAuditLog } from '@/lib/server/audit-logger';
import { extractChangedValues } from '@/lib/utils/objectDiff';

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
    
    // Get existing record for audit logging
    const existing = await DatabaseService.getInformationSheetRecordById(id);
    if (!existing) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    
    const updated = await DatabaseService.updateInformationSheetRecord(id, body);
    if (!updated) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Record audit log for update
    const before = { ...existing };
    const after = { ...updated };
    const { oldValues, newValues } = extractChangedValues(before, after, { ignoreKeys: ['id'] });
    
    if (Object.keys(oldValues).length > 0 || Object.keys(newValues).length > 0) {
      await recordAuditLog(request, {
        action: 'update',
        tableName: 'information_sheet_records',
        recordId: id,
        oldValues,
        newValues,
      });
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
    
    // Get existing record for audit logging
    const existing = await DatabaseService.getInformationSheetRecordById(id);
    
    const deleted = await DatabaseService.softDeleteInformationSheetRecord(id);
    if (!deleted) {
      const response: ApiResponse = { success: false, error: 'Record not found' };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Record audit log for delete
    if (existing) {
      await recordAuditLog(request, {
        action: 'delete',
        tableName: 'information_sheet_records',
        recordId: id,
        oldValues: { control_number: existing.control_number },
        newValues: null,
      });
    }
    
    const response: ApiResponse = { success: true, data: deleted };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting information sheet record:', error);
    const response: ApiResponse = { success: false, error: 'Failed to delete information sheet record' };
    return NextResponse.json(response, { status: 500 });
  }
}


